/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Processing Time Estimator Plugin
 *
 * Estimates training processing time based on the number of training samples
 * using regression analysis. Works with Dataset nodes that have a
 * num_training_samples attribute.
 *
 * Based on regression models derived from empirical data:
 * - 26,000 images → 33 minutes
 * - 50,000 images → 54 minutes
 * - 60,000 images → 72 minutes
 *
 * @author Processing Time Research Team
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

    /**
     * Initializes a new instance of ProcessingTimeEstimator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ProcessingTimeEstimator.
     * @constructor
     */
    var ProcessingTimeEstimator = function () {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin.
     * @type {object}
     */
    ProcessingTimeEstimator.metadata = pluginMetadata;

    ProcessingTimeEstimator.prototype = Object.create(PluginBase.prototype);
    ProcessingTimeEstimator.prototype.constructor = ProcessingTimeEstimator;

    /**
     * Predict processing time based on the number of images
     *
     * @param {number} numImages - Number of images to process
     * @param {string} modelType - Type of model ('linear' or 'polynomial')
     * @returns {number} Predicted time in minutes
     */
    ProcessingTimeEstimator.prototype.predictProcessingTime = function(numImages, modelType) {
        if (modelType === 'linear') {
            // Linear model: Time = 3.2620 + 0.001097 * Images
            var intercept = 3.2620;
            var coefficient = 0.001097;
            return intercept + coefficient * numImages;

        } else if (modelType === 'polynomial') {
            // Polynomial model (degree 2)
            var c0 = 3.2619607843137337;
            var c1 = 0.0010971764705882374;
            var c2 = 4.411764705882354e-10;
            return c0 + c1 * numImages + c2 * Math.pow(numImages, 2);

        } else {
            throw new Error('model_type must be "linear" or "polynomial"');
        }
    };

    /**
     * Predict time for multiple models
     *
     * @param {Array<number>} imageCounts - Array of image counts
     * @param {string} modelType - Type of regression model
     * @param {string} processing - 'sequential' or 'parallel'
     * @returns {object} Prediction results
     */
    ProcessingTimeEstimator.prototype.predictMultiModelTime = function(imageCounts, modelType, processing) {
        var self = this;
        var individualTimes = imageCounts.map(function(count) {
            return self.predictProcessingTime(count, modelType);
        });

        var totalTime;
        if (processing === 'sequential') {
            totalTime = individualTimes.reduce(function(acc, t) {
                return acc + t;
            }, 0);
        } else if (processing === 'parallel') {
            totalTime = Math.max.apply(null, individualTimes);
        } else {
            throw new Error('processing must be "sequential" or "parallel"');
        }

        return {
            total_time_minutes: totalTime,
            total_time_hours: totalTime / 60,
            individual_times: individualTimes,
            num_models: imageCounts.length,
            processing_mode: processing
        };
    };

    /**
     * Format time for display
     *
     * @param {number} minutes - Time in minutes
     * @returns {string} Formatted time string
     */
    ProcessingTimeEstimator.prototype.formatTime = function(minutes) {
        var hours = Math.floor(minutes / 60);
        var mins = Math.round(minutes % 60);

        if (hours > 0) {
            return hours + 'h ' + mins + 'm (' + minutes.toFixed(1) + ' minutes)';
        } else {
            return mins + ' minutes (' + minutes.toFixed(1) + ' minutes)';
        }
    };

    /**
     * Main function for the plugin to execute.
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ProcessingTimeEstimator.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            activeNode = self.activeNode,
            config = self.getCurrentConfig();

        self.logger.info('Processing Time Estimator starting...');

        // Get the active node (the selected node in WebGME)
        var nodeName = core.getAttribute(activeNode, 'name');
        var nodeType = core.getAttribute(core.getMetaType(activeNode), 'name');

        self.logger.info('Selected node: ' + nodeName + ' (type: ' + nodeType + ')');

        // Check if the node has num_training_samples attribute
        var numTrainingSamples = core.getAttribute(activeNode, 'num_training_samples');

        if (numTrainingSamples === undefined || numTrainingSamples === null) {
            var errorMsg = 'Error: Selected node "' + nodeName + '" does not have a "num_training_samples" attribute.\n' +
                          'Please select a Dataset node (e.g., CIFAR10_Dataset, GTSRB_Dataset, etc.) and run the plugin again.';
            self.logger.error(errorMsg);
            self.createMessage(activeNode, errorMsg, 'error');
            self.result.setSuccess(false);
            callback(errorMsg, self.result);
            return;
        }

        // Get configuration
        var modelType = config.modelType || 'linear';
        var processingMode = config.processingMode || 'sequential';

        self.logger.info('Configuration: modelType=' + modelType + ', processingMode=' + processingMode);
        self.logger.info('Number of training samples: ' + numTrainingSamples);

        // Calculate processing time
        var timeMinutes = self.predictProcessingTime(numTrainingSamples, modelType);
        var timeHours = timeMinutes / 60;

        // Create detailed result message
        var resultMsg = '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '  PROCESSING TIME ESTIMATION\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '\n' +
            'Dataset: ' + nodeName + '\n' +
            'Number of training samples: ' + numTrainingSamples.toLocaleString() + '\n' +
            'Regression model: ' + modelType + '\n' +
            '\n' +
            'ESTIMATED PROCESSING TIME:\n' +
            '  • ' + timeMinutes.toFixed(1) + ' minutes\n' +
            '  • ' + timeHours.toFixed(2) + ' hours\n' +
            '  • ' + (timeHours / 24).toFixed(3) + ' days\n' +
            '\n';

        // Add model comparison
        var timeLinear = self.predictProcessingTime(numTrainingSamples, 'linear');
        var timePoly = self.predictProcessingTime(numTrainingSamples, 'polynomial');

        resultMsg += 'Model Comparison:\n' +
            '  • Linear:     ' + timeLinear.toFixed(1) + ' min (' + (timeLinear / 60).toFixed(2) + ' hours)\n' +
            '  • Polynomial: ' + timePoly.toFixed(1) + ' min (' + (timePoly / 60).toFixed(2) + ' hours)\n' +
            '\n';

        // Add reference data
        resultMsg += 'Reference Data (empirical measurements):\n' +
            '  • 26,000 images → 33 minutes\n' +
            '  • 50,000 images → 54 minutes\n' +
            '  • 60,000 images → 72 minutes\n' +
            '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

        self.logger.info(resultMsg);

        // Create a message node if possible (optional - for visualization)
        self.createMessage(activeNode,
            'Processing Time Estimate: ' + self.formatTime(timeMinutes) + ' for ' +
            numTrainingSamples.toLocaleString() + ' samples',
            'info');

        // Set success and return
        self.result.setSuccess(true);
        callback(null, self.result);
    };

    return ProcessingTimeEstimator;
});
