/*globals define*/
/*jshint node:true, browser:true*/

/**
 * InteractiveEstimatorUI
 *
 * UI-only modal: reads precomputed values from node attributes and displays them.
 * No coefficients or compute are bundled. Defaults:
 *   estimateAttribute = inference_time_estimate
 *   totalAttribute    = total_experts_estimate
 *   activeAttribute   = meta_top_k
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

    function showModal(total, active, estimate) {
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
                + '        <p><strong>Estimated:</strong> <span id="' + modalId + '-result"></span></p>'
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
        $('#' + modalId + '-total').text(total !== undefined ? total : '(n/a)');
        $('#' + modalId + '-active').text(active !== undefined ? active : '(n/a)');
        $('#' + modalId + '-result').text(
            estimate !== undefined && estimate !== null && !Number.isNaN(estimate)
                ? estimate.toFixed(6)
                : '(n/a)'
        );
        $existing.modal('show');
    }

    InteractiveEstimatorUI.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            node = self.activeNode || self.rootNode,
            config = self.getCurrentConfig(),
            estimateAttr = config.estimateAttribute || 'inference_time_estimate',
            totalAttr = config.totalAttribute || 'total_experts_estimate',
            activeAttr = config.activeAttribute || 'meta_top_k',
            estimate = core.getAttribute(node, estimateAttr),
            total = core.getAttribute(node, totalAttr),
            active = core.getAttribute(node, activeAttr);

        self.logger.info('Showing estimate from attributes',
            estimateAttr + '=' + estimate,
            totalAttr + '=' + total,
            activeAttr + '=' + active);

        self.createMessage(node, 'Estimate: ' + (estimate !== null ? estimate : '(n/a)') +
            ' (total=' + (total !== null ? total : 'n/a') +
            ', active=' + (active !== null ? active : 'n/a') + ')', 'info');

        try {
            showModal(total, active, typeof estimate === 'number' ? estimate : undefined);
        } catch (e) {
            self.logger.warn('Modal display failed: ' + e.toString());
        }

        self.result.setSuccess(true);
        callback(null, self.result);
    };

    return InteractiveEstimatorUI;
});
