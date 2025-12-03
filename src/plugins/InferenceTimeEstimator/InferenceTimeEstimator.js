/*globals define*/
/*jshint node:true, browser:true*/

/**
 * InferenceTimeEstimator
 *
 * Simple plugin that applies the fitted linear model:
 *   T = 0.02791429 + 0.01657143 * active_k + 0.00951429 * total_experts
 *
 * It writes the prediction to an attribute on the active node
 * (default: "inference_time_estimate") so you can see it in the
 * Property Editor after running the plugin.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    var COEF = {
        // Quadratic-in-features regression:
        // T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2
        b0: 0.05348109,
        b1: 0.00532143,
        b2: 0.00173004,
        b3: 0.00803571,
        b4: -0.00446429,
        b5: -0.00092752
    };

    var InferenceTimeEstimator = function () {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    InferenceTimeEstimator.metadata = pluginMetadata;
    InferenceTimeEstimator.prototype = Object.create(PluginBase.prototype);
    InferenceTimeEstimator.prototype.constructor = InferenceTimeEstimator;

    function showModal(total, active, result) {
        if (typeof window === 'undefined' || typeof window.$ === 'undefined') {
            return;
        }
        var $ = window.$;
        var modalId = 'inference-estimator-modal';
        var $existing = $('#' + modalId);
        if ($existing.length === 0) {
            var html = ''
                + '<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">'
                + '  <div class="modal-dialog" role="document">'
                + '    <div class="modal-content" style="color:#0f172a;">'
                + '      <div class="modal-header">'
                + '        <h4 class="modal-title">Inference Time Estimate</h4>'
                + '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'
                + '          <span aria-hidden="true">&times;</span>'
                + '        </button>'
                + '      </div>'
                + '      <div class="modal-body">'
                + '        <p><strong>Total experts (N):</strong> <span id="' + modalId + '-total"></span></p>'
                + '        <p><strong>Active experts (k):</strong> <span id="' + modalId + '-active"></span></p>'
                + '        <p><strong>Predicted inference time:</strong> <span id="' + modalId + '-result"></span></p>'
                + '      </div>'
                + '      <div class="modal-footer">'
                + '        <button type="button" class="btn btn-primary" data-dismiss="modal">OK</button>'
                + '      </div>'
                + '    </div>'
                + '  </div>'
                + '</div>';
            $('body').append(html);
            $existing = $('#' + modalId);
        }
        $('#' + modalId + '-total').text(total);
        $('#' + modalId + '-active').text(active);
        $('#' + modalId + '-result').text(result.toFixed(6));
        $existing.modal('show');
    }

    InferenceTimeEstimator.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            node = self.activeNode || self.rootNode,
            config = self.getCurrentConfig(),
            defaultActive = pluginMetadata.configStructure
                .filter(function (c) { return c.name === 'activeExperts'; })
                .map(function (c) { return c.value; })[0],
            outAttr = config.outputAttributeName || 'inference_time_estimate';

        function countExperts(n) {
            return core.loadChildren(n)
                .then(function (children) {
                    var count = 0,
                        promises = [];
                    children.forEach(function (child) {
                        var base = core.getBase(child),
                            baseName = base ? core.getAttribute(base, 'name') : '',
                            ownName = core.getAttribute(child, 'name');
                        if (ownName === 'Experts' || baseName === 'Experts') {
                            count += 1;
                        }
                        promises.push(countExperts(child).then(function (c) { count += c; }));
                    });
                    return Promise.all(promises).then(function () { return count; });
                });
        }

        countExperts(node)
            .then(function (expertCount) {
                var totalInput = Number(config.totalExperts),
                    total = Number.isFinite(totalInput) && totalInput >= 1 ? totalInput :
                        (expertCount > 0 ? expertCount : 1),
                    attrMetaTopK = Number(core.getAttribute(node, 'meta_top_k')),
                    configActive = Number(config.activeExperts),
                    active,
                    result;

                // Choose active experts: prefer user input; otherwise node attribute; otherwise default.
                if (Number.isFinite(configActive)) {
                    active = configActive;
                } else if (Number.isFinite(attrMetaTopK)) {
                    active = attrMetaTopK;
                } else {
                    active = defaultActive || 1;
                }

                // Clamp active to total.
                if (active > total) {
                    active = total;
                }

                if (!Number.isFinite(total) || total < 1) {
                    throw new Error('totalExperts must be a positive number');
                }
                if (!Number.isFinite(active) || active < 1) {
                    throw new Error('activeExperts must be at least 1');
                }

                result = COEF.b0 +
                    COEF.b1 * active +
                    COEF.b2 * total +
                    COEF.b3 * active * total +
                    COEF.b4 * active * active +
                    COEF.b5 * total * total;

                // Synchronize attribute so Property Editor and plugin input stay aligned.
                core.setAttribute(node, 'meta_top_k', active);
                core.setAttribute(node, outAttr, result);
                core.setAttribute(node, 'total_experts_estimate', total);
                self.logger.info('Predicted inference time:', result.toFixed(6),
                    '(total=' + total + ', active=' + active + ', attr=' + outAttr + ')');

                self.createMessage(node, 'Predicted inference time: ' + result.toFixed(6) +
                    ' (total=' + total + ', active=' + active + ')', 'info');

                // Show client-side modal if available (browser-side execution).
                try {
                    showModal(total, active, result);
                } catch (e) {
                    self.logger.warn('Modal display failed: ' + e.toString());
                }

                self.result.setSuccess(true);
                self.result.addArtifact('inference_time', {
                    predicted: result,
                    total_experts: total,
                    active_experts: active,
                    attribute: outAttr
                });

                // Persist the change to the branch so the attribute shows up in the UI.
                self.save('Stored inference time estimate on node', callback);
            })
            .catch(function (err) {
                self.logger.error(err.toString());
                self.result.setSuccess(false);
                callback(err, self.result);
            });
    };

    return InferenceTimeEstimator;
});
