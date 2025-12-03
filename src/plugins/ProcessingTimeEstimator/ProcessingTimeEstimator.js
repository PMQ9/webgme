/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Processing Time Estimator Plugin v2.1
 *
 * Supports two modes:
 * 1. Single mode: Estimate time for a selected Dataset node
 * 2. Multiple mode: Configure multiple datasets and get combined estimates
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

    var ProcessingTimeEstimator = function () {
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    ProcessingTimeEstimator.metadata = pluginMetadata;
    ProcessingTimeEstimator.prototype = Object.create(PluginBase.prototype);
    ProcessingTimeEstimator.prototype.constructor = ProcessingTimeEstimator;

    /**
     * Predict processing time based on the number of images
     */
    ProcessingTimeEstimator.prototype.predictProcessingTime = function(numImages, modelType) {
        modelType = modelType || 'linear';

        if (modelType === 'linear') {
            var intercept = 3.2620;
            var coefficient = 0.001097;
            return intercept + coefficient * numImages;
        } else if (modelType === 'polynomial') {
            var c0 = 3.2619607843137337;
            var c1 = 0.0010971764705882374;
            var c2 = 4.411764705882354e-10;
            return c0 + c1 * numImages + c2 * Math.pow(numImages, 2);
        } else {
            return 3.2620 + 0.001097 * numImages;
        }
    };

    /**
     * Format time for display
     */
    ProcessingTimeEstimator.prototype.formatTime = function(minutes) {
        var hours = Math.floor(minutes / 60);
        var mins = Math.round(minutes % 60);

        if (hours > 0) {
            return hours + 'h ' + mins + 'm';
        } else {
            return mins + ' minutes';
        }
    };

    /**
     * Main function for the plugin to execute.
     */
    ProcessingTimeEstimator.prototype.main = function (callback) {
        var self = this;

        try {
            var config = self.getCurrentConfig();
            var mode = config.mode || 'single';

            self.logger.info('Processing Time Estimator v2.1 starting in ' + mode + ' mode...');

            if (mode === 'single') {
                self.runSingleMode(callback);
            } else {
                self.runMultipleMode(callback);
            }

        } catch (err) {
            self.logger.error('Error in plugin: ' + err.toString());
            self.logger.error('Stack: ' + err.stack);
            self.result.setSuccess(false);
            callback(err, self.result);
        }
    };

    /**
     * Single mode: Estimate time for selected dataset node
     */
    ProcessingTimeEstimator.prototype.runSingleMode = function(callback) {
        var self = this;
        var core = self.core;
        var activeNode = self.activeNode;
        var config = self.getCurrentConfig();

        var nodeName = core.getAttribute(activeNode, 'name');
        var numTrainingSamples = core.getAttribute(activeNode, 'num_training_samples');

        if (numTrainingSamples === undefined || numTrainingSamples === null) {
            var errorMsg = 'Selected node does not have "num_training_samples" attribute. Please select a Dataset node or use "multiple" mode.';
            self.logger.error(errorMsg);
            self.result.setSuccess(false);
            callback(errorMsg, self.result);
            return;
        }

        var modelType = config.modelType || 'linear';
        var timeMinutes = self.predictProcessingTime(numTrainingSamples, modelType);
        var timeHours = timeMinutes / 60;

        var resultMsg = '\n' +
            '===============================================\n' +
            '  PROCESSING TIME ESTIMATION (Single Dataset)\n' +
            '===============================================\n' +
            '\n' +
            'Dataset: ' + nodeName + '\n' +
            'Training samples: ' + numTrainingSamples.toLocaleString() + '\n' +
            'Regression model: ' + modelType + '\n' +
            '\n' +
            'ESTIMATED TIME:\n' +
            '  * ' + timeMinutes.toFixed(1) + ' minutes\n' +
            '  * ' + timeHours.toFixed(2) + ' hours\n' +
            '  * ' + (timeHours / 24).toFixed(3) + ' days\n' +
            '\n' +
            'Reference Data:\n' +
            '  * 26,000 images = 33 min\n' +
            '  * 50,000 images = 54 min\n' +
            '  * 60,000 images = 72 min\n' +
            '\n' +
            '===============================================\n';

        self.logger.info(resultMsg);
        self.saveResults(resultMsg, activeNode, timeMinutes, timeHours, callback);
    };

    /**
     * Multiple mode: Estimate time for configured datasets
     */
    ProcessingTimeEstimator.prototype.runMultipleMode = function(callback) {
        var self = this;
        var config = self.getCurrentConfig();
        var modelType = config.modelType || 'linear';
        var processingMode = config.processingMode || 'sequential';

        // Collect datasets from configuration
        var datasets = [];
        for (var i = 1; i <= 3; i++) {
            var datasetType = config['dataset' + i + '_type'];
            var samples = config['dataset' + i + '_samples'];

            if (datasetType && datasetType !== 'None' && samples > 0) {
                datasets.push({
                    name: datasetType,
                    samples: samples
                });
            }
        }

        if (datasets.length === 0) {
            var errorMsg = 'No datasets configured. Please set at least one dataset with samples > 0.';
            self.logger.error(errorMsg);
            self.result.setSuccess(false);
            callback(errorMsg, self.result);
            return;
        }

        // Calculate times for each dataset
        var datasetResults = [];
        var totalSequential = 0;
        var maxParallel = 0;

        for (var j = 0; j < datasets.length; j++) {
            var dataset = datasets[j];
            var time = self.predictProcessingTime(dataset.samples, modelType);

            datasetResults.push({
                name: dataset.name,
                samples: dataset.samples,
                timeMinutes: time,
                timeHours: time / 60
            });

            totalSequential += time;
            if (time > maxParallel) {
                maxParallel = time;
            }
        }

        // Determine total time based on processing mode
        var totalTime = processingMode === 'sequential' ? totalSequential : maxParallel;
        var totalHours = totalTime / 60;

        // Build comprehensive result message
        var resultMsg = '\n' +
            '================================================================\n' +
            '  PROCESSING TIME ESTIMATION (Multiple Datasets)\n' +
            '================================================================\n' +
            '\n' +
            'Configuration:\n' +
            '  * Number of datasets: ' + datasets.length + '\n' +
            '  * Regression model: ' + modelType + '\n' +
            '  * Processing mode: ' + processingMode.toUpperCase() + '\n' +
            '\n' +
            '----------------------------------------------------------------\n' +
            'INDIVIDUAL DATASET ESTIMATES:\n' +
            '----------------------------------------------------------------\n';

        for (var k = 0; k < datasetResults.length; k++) {
            var result = datasetResults[k];
            resultMsg += '\n' + (k + 1) + '. ' + result.name + '\n' +
                '   Samples: ' + result.samples.toLocaleString() + '\n' +
                '   Time: ' + result.timeMinutes.toFixed(1) + ' min (' +
                result.timeHours.toFixed(2) + ' hours)\n';
        }

        resultMsg += '\n' +
            '----------------------------------------------------------------\n' +
            'TOTAL ESTIMATED TIME (' + processingMode.toUpperCase() + '):\n' +
            '----------------------------------------------------------------\n' +
            '\n';

        if (processingMode === 'sequential') {
            resultMsg += 'Sequential Processing (sum of all times):\n' +
                '  * ' + totalTime.toFixed(1) + ' minutes\n' +
                '  * ' + totalHours.toFixed(2) + ' hours\n' +
                '  * ' + (totalHours / 24).toFixed(3) + ' days\n';
        } else {
            resultMsg += 'Parallel Processing (maximum time):\n' +
                '  * ' + totalTime.toFixed(1) + ' minutes\n' +
                '  * ' + totalHours.toFixed(2) + ' hours\n' +
                '  * ' + (totalHours / 24).toFixed(3) + ' days\n' +
                '\n' +
                'Note: Parallel processing time is determined by the slowest dataset.\n';
        }

        resultMsg += '\n' +
            '----------------------------------------------------------------\n' +
            'COMPARISON (Sequential vs Parallel):\n' +
            '----------------------------------------------------------------\n' +
            '\n' +
            'Sequential (1 GPU/machine - train one after another):\n' +
            '  Total time: ' + totalSequential.toFixed(1) + ' min (' +
            (totalSequential / 60).toFixed(2) + ' hours)\n' +
            '\n' +
            'Parallel (' + datasets.length + ' GPUs/machines - train all simultaneously):\n' +
            '  Total time: ' + maxParallel.toFixed(1) + ' min (' +
            (maxParallel / 60).toFixed(2) + ' hours)\n' +
            '\n' +
            'Time Saved with Parallel Processing:\n' +
            '  ' + (totalSequential - maxParallel).toFixed(1) +
            ' min (' + ((totalSequential - maxParallel) / 60).toFixed(2) + ' hours) faster\n' +
            '  ' + ((1 - maxParallel / totalSequential) * 100).toFixed(1) + '% reduction in total time\n' +
            '\n' +
            'Reference Data (empirical measurements):\n' +
            '  * 26,000 images = 33 min\n' +
            '  * 50,000 images = 54 min\n' +
            '  * 60,000 images = 72 min\n' +
            '\n' +
            '================================================================\n';

        self.logger.info(resultMsg);

        // Create summary for notification
        var summary = {
            mode: 'multiple',
            datasets: datasets.length,
            sequential: totalSequential,
            parallel: maxParallel,
            selected: processingMode
        };

        self.saveResults(resultMsg, self.activeNode, totalTime, totalHours, callback, summary);
    };

    /**
     * Save results as artifact and optionally to node attributes
     */
    ProcessingTimeEstimator.prototype.saveResults = function(resultMsg, node, timeMinutes, timeHours, callback, summary) {
        var self = this;
        var core = self.core;

        // Save results as a text artifact
        var artifact = self.blobClient.createArtifact('ProcessingTimeEstimate');
        var files = {};
        files['processing_time_estimate.txt'] = resultMsg;

        artifact.addFiles(files, function(err) {
            if (err) {
                self.logger.error('Error adding files to artifact: ' + err);
                self.result.setSuccess(false);
                callback(err, self.result);
                return;
            }

            artifact.save(function(err, hash) {
                if (err) {
                    self.logger.error('Error saving artifact: ' + err);
                    self.result.setSuccess(false);
                    callback(err, self.result);
                    return;
                }

                self.logger.info('Results saved to artifact. Download hash: ' + hash);
                self.result.addArtifact(hash);

                // Store hash for dialog
                self._artifactHash = hash;

                // Create and display summary notification
                var notificationMsg = '';
                if (summary) {
                    // Multiple mode - show comparison
                    notificationMsg = 'PROCESSING TIME ESTIMATE (' + summary.datasets + ' datasets)\n\n' +
                        'Sequential (1 GPU): ' + summary.sequential.toFixed(1) + ' min (' +
                        (summary.sequential / 60).toFixed(2) + ' hours)\n' +
                        'Parallel (' + summary.datasets + ' GPUs): ' + summary.parallel.toFixed(1) + ' min (' +
                        (summary.parallel / 60).toFixed(2) + ' hours)\n\n' +
                        'Time saved: ' + (summary.sequential - summary.parallel).toFixed(1) + ' min (' +
                        ((1 - summary.parallel / summary.sequential) * 100).toFixed(1) + '% reduction)\n\n' +
                        'Download the artifact for complete details.';
                } else {
                    // Single mode - show single estimate
                    notificationMsg = 'PROCESSING TIME ESTIMATE\n\n' +
                        'Estimated time: ' + timeMinutes.toFixed(1) + ' min (' + timeHours.toFixed(2) + ' hours)\n\n' +
                        'Download the artifact for complete details.';
                }

                // Log the notification message
                self.logger.info('\n' + notificationMsg);

                // Add notification message to plugin result for UI display
                self.result.setSuccess(true);
                self.createMessage(node, notificationMsg);

                // Show custom dialog
                self.showEstimateDialog(summary, timeMinutes, timeHours, node);

                // Try to add attributes if node has num_training_samples (single mode)
                var numSamples = core.getAttribute(node, 'num_training_samples');
                if (numSamples !== undefined && numSamples !== null) {
                    core.setAttribute(node, 'estimated_processing_time_minutes', timeMinutes);
                    core.setAttribute(node, 'estimated_processing_time_hours', parseFloat(timeHours.toFixed(2)));

                    var commitMsg = 'Added processing time estimate: ' + timeMinutes.toFixed(1) + ' minutes';
                    self.save(commitMsg, function(err) {
                        if (err) {
                            self.logger.warn('Could not save attributes to node: ' + err);
                        } else {
                            self.logger.info('Processing time attributes added to node');
                        }

                        callback(null, self.result);
                    });
                } else {
                    callback(null, self.result);
                }
            });
        });
    };

    /**
     * Show the processing time estimate dialog
     */
    ProcessingTimeEstimator.prototype.showEstimateDialog = function(summary, timeMinutes, timeHours, node) {
        var self = this;

        // Create dialog HTML directly
        var dialogHtml = '<div class="processing-time-estimate-dialog modal fade" tabindex="-1" role="dialog">' +
            '<div class="modal-dialog modal-sm">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
                        '<h4 class="modal-title">Processing Time Estimate</h4>' +
                    '</div>' +
                    '<div class="modal-body">' +
                        '<div class="estimate-content"></div>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button class="btn btn-default btn-download">Download Report</button>' +
                        '<button class="btn btn-primary btn-ok">OK</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        var $dialog = $(dialogHtml);
        var $content = $dialog.find('.estimate-content');

        if (summary) {
            // Multiple mode
            var timeSaved = summary.sequential - summary.parallel;
            var timeSavedPercent = (1 - summary.parallel / summary.sequential) * 100;

            $content.html(
                '<p><strong>Total datasets:</strong> ' + summary.datasets + '</p>' +
                '<p><strong>Sequential (1 GPU):</strong> ' + summary.sequential.toFixed(1) + ' min (' +
                    (summary.sequential / 60).toFixed(2) + ' hours)</p>' +
                '<p><strong>Parallel (' + summary.datasets + ' GPUs):</strong> ' + summary.parallel.toFixed(1) + ' min (' +
                    (summary.parallel / 60).toFixed(2) + ' hours)</p>' +
                '<p><strong>Time saved:</strong> ' + timeSaved.toFixed(1) + ' min (' +
                    timeSavedPercent.toFixed(1) + '% reduction)</p>'
            );
        } else {
            // Single mode
            var nodeName = self.core.getAttribute(node, 'name');
            $content.html(
                '<p><strong>Dataset:</strong> ' + nodeName + '</p>' +
                '<p><strong>Estimated time:</strong> ' + timeMinutes.toFixed(1) + ' min (' +
                    timeHours.toFixed(2) + ' hours)</p>'
            );
        }

        // OK button handler
        $dialog.find('.btn-ok').on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            $dialog.modal('hide');
        });

        // Download Report button handler
        $dialog.find('.btn-download').on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (self._artifactHash) {
                var downloadUrl = '/rest/blob/download/' + self._artifactHash;
                window.location.href = downloadUrl;
            }
        });

        // Cleanup on close
        $dialog.on('hidden.bs.modal', function () {
            $dialog.remove();
        });

        // Show the modal
        $dialog.modal('show');
    };

    return ProcessingTimeEstimator;
});
