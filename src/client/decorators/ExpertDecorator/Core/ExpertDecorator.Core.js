/*globals define, _, $*/
/*jshint browser: true*/

/**
 * Expert Decorator - Displays backbone layer details on canvas
 * @author MoE Research Team
 */

define([
    'js/Constants',
    'decorators/ModelDecorator/Core/ModelDecorator.Core'
], function (CONSTANTS, ModelDecoratorCore) {

    'use strict';

    var ExpertDecoratorCore = function () {
        ModelDecoratorCore.apply(this, arguments);
    };

    _.extend(ExpertDecoratorCore.prototype, ModelDecoratorCore.prototype);

    ExpertDecoratorCore.prototype._initializeVariables = function (params) {
        ModelDecoratorCore.prototype._initializeVariables.call(this, params);
        this.skinParts.$backboneLayers = undefined;
    };

    ExpertDecoratorCore.prototype._renderContent = function () {
        ModelDecoratorCore.prototype._renderContent.call(this);
        this.skinParts.$backboneLayers = this.$el.find('.backbone-layers');
    };

    ExpertDecoratorCore.prototype._update = function () {
        ModelDecoratorCore.prototype._update.call(this);
        this._updateBackboneLayers();
    };

    ExpertDecoratorCore.prototype._updateBackboneLayers = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            backboneLayers = '',
            numConvLayers = '',
            numFcLayers = '';

        if (nodeObj) {
            backboneLayers = nodeObj.getAttribute('backbone_layers') || '';
            numConvLayers = nodeObj.getAttribute('num_conv_layers') || '';
            numFcLayers = nodeObj.getAttribute('num_fc_layers') || '';
        }

        if (this.skinParts.$backboneLayers) {
            if (backboneLayers) {
                // Display backbone layers info
                var displayText = '';
                if (numConvLayers && numFcLayers) {
                    displayText = numConvLayers + ' Conv + ' + numFcLayers + ' FC layers\n';
                }
                displayText += backboneLayers;

                this.skinParts.$backboneLayers.text(displayText);
                this.skinParts.$backboneLayers.show();
            } else {
                this.skinParts.$backboneLayers.hide();
            }
        }
    };

    return ExpertDecoratorCore;
});
