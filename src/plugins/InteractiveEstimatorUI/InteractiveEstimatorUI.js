/*globals define*/
/*jshint node:true, browser:true*/

/**
 * InteractiveEstimatorUI
 *
 * Generic client-side estimator with an in-UI modal.
 * Model: T = b0 + b1*k + b2*N + b3*kN + b4*k^2 + b5*N^2
 * Coefficients, total, and active are provided via the plugin dialog.
 * If total is 0/empty, it auto-counts nodes named "Experts" under the selected node.
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

    var InteractiveEstimatorUI = function () {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    InteractiveEstimatorUI.metadata = pluginMetadata;
    InteractiveEstimatorUI.prototype = Object.create(PluginBase.prototype);
    InteractiveEstimatorUI.prototype.constructor = InteractiveEstimatorUI;

    function showModal(total, active, result) {
        if (typeof window === 'undefined' || typeof window.$ === 'undefined') {
            return;
        }
        var $ = window.$;
        var modalId = 'interactive-estimator-ui-modal';
        var $existing = $('#' + modalId);
        if ($existing.length === 0) {
            var html = ''
                + '<div class="modal fade" id="' + modalId + '" tabindex="-1" role="dialog">'
                + '  <div class="modal-dialog" role="document">'
                + '    <div class="modal-content" style="color:#0f172a;">'
                + '      <div class="modal-header">'
                + '        <h4 class="modal-title">Estimator Result</h4>'
                + '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">'
                + '          <span aria-hidden="true">&times;</span>'
                + '        </button>'
                + '      </div>'
                + '      <div class="modal-body">'
                + '        <p><strong>Total (N):</strong> <span id="' + modalId + '-total"></span></p>'
                + '        <p><strong>Active (k):</strong> <span id="' + modalId + '-active"></span></p>'
                + '        <p><strong>Predicted:</strong> <span id="' + modalId + '-result"></span></p>'
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

    InteractiveEstimatorUI.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            node = self.activeNode || self.rootNode,
            config = self.getCurrentConfig(),
            outAttr = config.outputAttributeName || 'estimate';

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
                    configActive = Number(config.activeExperts),
                    defaultActive = 1,
                    active = Number.isFinite(configActive) ? configActive : defaultActive,
                    b0 = Number(config.coeff_b0) || 0,
                    b1 = Number(config.coeff_b1) || 0,
                    b2 = Number(config.coeff_b2) || 0,
                    b3 = Number(config.coeff_b3) || 0,
                    b4 = Number(config.coeff_b4) || 0,
                    b5 = Number(config.coeff_b5) || 0,
                    result;

                if (active > total) {
                    active = total;
                }
                if (!Number.isFinite(total) || total < 1) {
                    throw new Error('totalExperts must be a positive number');
                }
                if (!Number.isFinite(active) || active < 1) {
                    throw new Error('activeExperts must be at least 1');
                }

                result = b0 +
                    b1 * active +
                    b2 * total +
                    b3 * active * total +
                    b4 * active * active +
                    b5 * total * total;

                // Sync attributes
                core.setAttribute(node, 'meta_top_k', active);
                core.setAttribute(node, 'total_experts_estimate', total);
                core.setAttribute(node, outAttr, result);

                self.logger.info('Predicted value:', result.toFixed(6),
                    '(total=' + total + ', active=' + active + ', attr=' + outAttr + ')');

                self.createMessage(node, 'Predicted value: ' + result.toFixed(6) +
                    ' (total=' + total + ', active=' + active + ')', 'info');

                try {
                    showModal(total, active, result);
                } catch (e) {
                    self.logger.warn('Modal display failed: ' + e.toString());
                }

                self.result.setSuccess(true);
                self.result.addArtifact('estimate', {
                    predicted: result,
                    total_experts: total,
                    active_experts: active,
                    attribute: outAttr
                });

                self.save('Stored estimate on node', callback);
            })
            .catch(function (err) {
                self.logger.error(err.toString());
                self.result.setSuccess(false);
                callback(err, self.result);
            });
    };

    return InteractiveEstimatorUI;
});
