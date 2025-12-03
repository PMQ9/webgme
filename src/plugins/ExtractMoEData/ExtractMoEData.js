/*globals define*/
/*jshint node:true, browser:true*/

/**
 * ExtractMoEData Plugin
 *
 * This plugin extracts key information from MoE (Mixture-of-Experts) models:
 * 1. Total number of "Experts" blocks in the canvas
 * 2. Attribute "meta_top_k" from Router blocks
 * 3. Total number of "*_Dataset" blocks
 * 4. Attribute "num_training_samples" from those Dataset blocks
 *
 * @author MoE Research Team
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'fs',
    'path',
    'child_process'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    fs,
    path,
    child_process) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ExtractMoEData.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExtractMoEData.
     * @constructor
     */
    var ExtractMoEData = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, etc.
     * @type {object}
     */
    ExtractMoEData.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ExtractMoEData.prototype = Object.create(PluginBase.prototype);
    ExtractMoEData.prototype.constructor = ExtractMoEData;

    /**
     * Main function for the plugin to execute.
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ExtractMoEData.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            activeNode = self.activeNode,
            META = self.META;

        self.logger.info('Starting MoE Data Extraction...');

        // Load the entire subtree to analyze all nodes
        core.loadSubTree(activeNode, function (err, nodes) {
            if (err) {
                self.logger.error('Error loading model tree:', err);
                self.result.setSuccess(false);
                callback(err, self.result);
                return;
            }

            // Initialize data collectors
            var expertsCount = 0;
            var routerInfo = [];
            var datasetCount = 0;
            var datasetInfo = [];

            self.logger.info('Analyzing ' + nodes.length + ' nodes...');

            // Helper function to check if node is a metamodel element (not an instance)
            function isMetamodelNode(node) {
                // Check if node is a direct child of root (metamodel elements are at root)
                var parent = core.getParent(node);
                var isRootChild = parent && core.getPath(parent) === core.getPath(self.rootNode);

                // Also check if it's in the MetaAspectSet
                var metaMembers = core.getMemberPaths(self.rootNode, 'MetaAspectSet') || [];
                var isInMetaAspect = metaMembers.indexOf(core.getPath(node)) !== -1;

                return isRootChild || isInMetaAspect;
            }

            // Iterate through all nodes
            nodes.forEach(function (node) {
                // Skip metamodel base classes - only count actual instances
                if (isMetamodelNode(node)) {
                    return; // Skip this node
                }

                var nodeName = core.getAttribute(node, 'name');
                var nodeType = core.getAttribute(core.getBase(node), 'name');

                // 1. Count "Experts" blocks (instances only)
                // Check if the node's base type is "ExpertModel" or if the name contains "Expert"
                if (nodeType === 'ExpertModel' || nodeName === 'Experts' ||
                    (META.ExpertModel && core.isTypeOf(node, META.ExpertModel))) {
                    expertsCount++;
                    self.logger.debug('Found Expert: ' + nodeName);
                }

                // 2. Extract Router information (meta_top_k attribute)
                if (nodeType === 'Router' || nodeName === 'Router' ||
                    (META.Router && core.isTypeOf(node, META.Router))) {
                    var metaTopK = core.getAttribute(node, 'meta_top_k');
                    var topK = core.getAttribute(node, 'top_k');
                    var routerName = nodeName;

                    routerInfo.push({
                        name: routerName,
                        meta_top_k: metaTopK !== undefined ? metaTopK : topK
                    });
                    self.logger.debug('Found Router: ' + routerName + ' with meta_top_k: ' + (metaTopK !== undefined ? metaTopK : topK));
                }

                // 3 & 4. Count Dataset blocks and extract num_training_samples (instances only)
                // Only match nodes with "_Dataset" (e.g., MNIST_Dataset, GTSRB_Dataset)
                // This excludes the base "Dataset" class
                if ((nodeType && nodeType.indexOf('_Dataset') !== -1) ||
                    (nodeName && nodeName.indexOf('_Dataset') !== -1)) {

                    datasetCount++;

                    var datasetName = nodeName;
                    var numTrainingSamples = core.getAttribute(node, 'num_training_samples');
                    var numTestSamples = core.getAttribute(node, 'num_test_samples');
                    var datasetTypeName = core.getAttribute(node, 'dataset_name');

                    datasetInfo.push({
                        name: datasetName,
                        dataset_type: datasetTypeName || nodeType,
                        num_training_samples: numTrainingSamples,
                        num_test_samples: numTestSamples
                    });
                    self.logger.debug('Found Dataset: ' + datasetName + ' with ' + numTrainingSamples + ' training samples');
                }
            });

            // Create the extraction report
            var report = {
                extraction_timestamp: new Date().toISOString(),
                total_experts: expertsCount,
                routers: routerInfo,
                total_datasets: datasetCount,
                datasets: datasetInfo
            };

            // ========================================
            // CALCULATE INFERENCE TIME AND TRAINING TIME
            // ========================================

            // Inference Time Formula: L_inference(B, A) = 0.081 - 0.013*B - 0.0085*A + 0.0105*A*B (seconds)
            // Parameters: B = meta_top_k, A = total_experts
            var inferenceTime = null;
            var inferenceTimeMs = null;

            if (routerInfo.length > 0 && routerInfo[0].meta_top_k !== undefined) {
                var B = routerInfo[0].meta_top_k; // meta_top_k
                var A = expertsCount; // total experts

                inferenceTime = 0.081 - 0.013*B - 0.0085*A + 0.0105*A*B; // in seconds
                inferenceTimeMs = inferenceTime * 1000; // convert to milliseconds

                report.inference_time_seconds = parseFloat(inferenceTime.toFixed(6));
                report.inference_time_ms = parseFloat(inferenceTimeMs.toFixed(2));

                self.logger.info('Calculated Inference Time: ' + inferenceTimeMs.toFixed(2) + 'ms (' + inferenceTime.toFixed(6) + 's)');
            } else {
                self.logger.warn('Cannot calculate inference time: missing router or meta_top_k');
                report.inference_time_seconds = null;
                report.inference_time_ms = null;
            }

            // Training Time Formula: T_total = SUM(0.00118 * I_i) + T_router(D) (minutes)
            // Parameters: D = number of experts, I_i = training samples per dataset
            // T_router(2) = 15 minutes, T_router(D) = 30*D - 45 (for D > 2)
            var trainingTime = null;
            var trainingTimeHours = null;

            if (datasetInfo.length > 0 && expertsCount > 0) {
                var D = expertsCount; // number of experts

                // Calculate sum of training samples weighted by coefficient
                var expertTrainingTime = 0;
                datasetInfo.forEach(function(dataset) {
                    if (dataset.num_training_samples) {
                        expertTrainingTime += 0.00118 * dataset.num_training_samples;
                    }
                });

                // Calculate router training time
                var routerTrainingTime;
                if (D === 2) {
                    routerTrainingTime = 15; // 15 minutes for 2 experts
                } else if (D > 2) {
                    routerTrainingTime = 30 * D - 45; // incremental fine-tuning formula
                } else {
                    routerTrainingTime = 0; // single expert or no experts
                }

                trainingTime = expertTrainingTime + routerTrainingTime; // in minutes
                trainingTimeHours = trainingTime / 60; // convert to hours

                report.training_time_minutes = parseFloat(trainingTime.toFixed(2));
                report.training_time_hours = parseFloat(trainingTimeHours.toFixed(2));
                report.expert_training_time_minutes = parseFloat(expertTrainingTime.toFixed(2));
                report.router_training_time_minutes = parseFloat(routerTrainingTime.toFixed(2));

                self.logger.info('Calculated Training Time: ' + trainingTime.toFixed(2) + ' mins (' + trainingTimeHours.toFixed(2) + ' hours)');
                self.logger.info('  - Expert training: ' + expertTrainingTime.toFixed(2) + ' mins');
                self.logger.info('  - Router training: ' + routerTrainingTime.toFixed(2) + ' mins');
            } else {
                self.logger.warn('Cannot calculate training time: missing datasets or experts');
                report.training_time_minutes = null;
                report.training_time_hours = null;
                report.expert_training_time_minutes = null;
                report.router_training_time_minutes = null;
            }

            // Log summary to backend
            self.logger.info('========== EXTRACTION RESULTS ==========');
            self.logger.info('1. Total Experts: ' + expertsCount);
            self.logger.info('2. Router(s) meta_top_k values:');
            routerInfo.forEach(function (router) {
                self.logger.info('   - ' + router.name + ': ' + router.meta_top_k);
            });
            self.logger.info('3. Total Datasets: ' + datasetCount);
            self.logger.info('4. Dataset training samples:');
            datasetInfo.forEach(function (dataset) {
                self.logger.info('   - ' + dataset.name + ': ' + dataset.num_training_samples + ' samples');
            });
            self.logger.info('========================================');

            // Display results in frontend UI
            self.createMessage(null, '========== MoE DATA EXTRACTION RESULTS ==========');
            self.createMessage(null, '');
            self.createMessage(null, '1. Total Experts: ' + expertsCount);
            self.createMessage(null, '');
            self.createMessage(null, '2. Router(s) meta_top_k values:');
            routerInfo.forEach(function (router) {
                self.createMessage(null, '   - ' + router.name + ': meta_top_k = ' + router.meta_top_k);
            });
            self.createMessage(null, '');
            self.createMessage(null, '3. Total Datasets: ' + datasetCount);
            self.createMessage(null, '');
            self.createMessage(null, '4. Dataset training samples:');
            datasetInfo.forEach(function (dataset) {
                self.createMessage(null, '   - ' + dataset.name + ': ' + dataset.num_training_samples + ' training samples');
            });
            self.createMessage(null, '');

            // Display time calculations
            if (report.inference_time_ms !== null) {
                self.createMessage(null, '5. Inference Time (estimated):');
                self.createMessage(null, '   - ' + report.inference_time_ms.toFixed(2) + ' ms (' + report.inference_time_seconds.toFixed(6) + ' seconds)');
                self.createMessage(null, '   - Formula: L = 0.081 - 0.013*B - 0.0085*A + 0.0105*A*B');
                self.createMessage(null, '   - Parameters: A=' + expertsCount + ' experts, B=' + routerInfo[0].meta_top_k + ' (top-k)');
                self.createMessage(null, '');
            }

            if (report.training_time_minutes !== null) {
                self.createMessage(null, '6. Training Time (estimated):');
                self.createMessage(null, '   - Total: ' + report.training_time_minutes.toFixed(2) + ' mins (' + report.training_time_hours.toFixed(2) + ' hours)');
                self.createMessage(null, '   - Expert training: ' + report.expert_training_time_minutes.toFixed(2) + ' mins');
                self.createMessage(null, '   - Router training: ' + report.router_training_time_minutes.toFixed(2) + ' mins');
                self.createMessage(null, '');
            }

            self.createMessage(null, '=================================================');
            self.createMessage(null, 'Full report saved as: moe_extraction_report.json');

            // Generate HTML report
            var htmlReport = self.generateHTMLReport(report);

            // Save both JSON and HTML artifacts
            var reportJson = JSON.stringify(report, null, 2);
            self.logger.info('Full Report:\n' + reportJson);

            // Save JSON artifact
            var jsonPromise = self.blobClient.putFile('moe_extraction_report.json', reportJson);

            // Save HTML artifact
            var htmlPromise = self.blobClient.putFile('moe_extraction_report.html', htmlReport);

            Promise.all([jsonPromise, htmlPromise])
                .then(function (hashes) {
                    var jsonHash = hashes[0];
                    var htmlHash = hashes[1];

                    self.result.addArtifact(jsonHash);
                    self.result.addArtifact(htmlHash);

                    // Get the URL for the HTML report
                    var htmlUrl = '/rest/blob/download/' + htmlHash;

                    self.logger.info('Report saved as artifacts');
                    self.createMessage(null, '');
                    self.createMessage(null, '📊 HTML Report auto-opening in browser...');
                    self.createMessage(null, 'Backup: Click "moe_extraction_report.html" in artifacts if browser doesn\'t open');

                    // Save HTML to temp file and auto-open in browser
                    var tempDir = require('os').tmpdir();
                    var tempHtmlPath = path.join(tempDir, 'moe_report_' + Date.now() + '.html');

                    fs.writeFile(tempHtmlPath, htmlReport, function (err) {
                        if (err) {
                            self.logger.warn('Could not save temp HTML file:', err);
                        } else {
                            self.logger.info('Temp HTML saved to:', tempHtmlPath);

                            // Open in browser based on platform
                            var openCommand;
                            if (process.platform === 'win32') {
                                // Windows: Use cmd /c to ensure proper execution
                                openCommand = 'cmd /c start "" "' + tempHtmlPath.replace(/"/g, '\\"') + '"';
                            } else if (process.platform === 'darwin') {
                                openCommand = 'open "' + tempHtmlPath + '"';
                            } else {
                                openCommand = 'xdg-open "' + tempHtmlPath + '"';
                            }

                            self.logger.info('Executing command:', openCommand);

                            child_process.exec(openCommand, function (error, stdout, stderr) {
                                if (error) {
                                    self.logger.error('Could not auto-open browser:', error.message);
                                    self.logger.error('stderr:', stderr);
                                    self.createMessage(null, '⚠️ Could not auto-open browser. Please click the artifact manually.');
                                } else {
                                    self.logger.info('✅ Browser opened successfully!');
                                    self.createMessage(null, '✅ Report opened in your browser!');
                                }
                            });
                        }
                    });

                    // Send notification
                    self.sendNotification({
                        message: '✨ MoE Data Extraction Complete! Report opening in browser...',
                        severity: 'success'
                    });

                    self.result.setSuccess(true);
                    callback(null, self.result);
                })
                .catch(function (err) {
                    self.logger.error('Error saving artifact:', err);
                    self.result.setSuccess(false);
                    callback(err, self.result);
                });
        });
    };

    /**
     * Generates a styled HTML report from the extraction data
     */
    ExtractMoEData.prototype.generateHTMLReport = function (report) {
        var html = '<!DOCTYPE html>\n';
        html += '<html lang="en">\n';
        html += '<head>\n';
        html += '    <meta charset="UTF-8">\n';
        html += '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
        html += '    <title>MoE Data Extraction Report</title>\n';
        html += '    <style>\n';
        html += '        * { margin: 0; padding: 0; box-sizing: border-box; }\n';
        html += '        body {\n';
        html += '            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n';
        html += '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
        html += '            padding: 40px 20px;\n';
        html += '            min-height: 100vh;\n';
        html += '        }\n';
        html += '        .container {\n';
        html += '            max-width: 1000px;\n';
        html += '            margin: 0 auto;\n';
        html += '            background: white;\n';
        html += '            border-radius: 16px;\n';
        html += '            box-shadow: 0 20px 60px rgba(0,0,0,0.3);\n';
        html += '            overflow: hidden;\n';
        html += '        }\n';
        html += '        .header {\n';
        html += '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n';
        html += '            color: white;\n';
        html += '            padding: 40px;\n';
        html += '            text-align: center;\n';
        html += '        }\n';
        html += '        .header h1 {\n';
        html += '            font-size: 32px;\n';
        html += '            font-weight: 600;\n';
        html += '            margin-bottom: 10px;\n';
        html += '        }\n';
        html += '        .header .timestamp {\n';
        html += '            opacity: 0.9;\n';
        html += '            font-size: 14px;\n';
        html += '        }\n';
        html += '        .content {\n';
        html += '            padding: 40px;\n';
        html += '        }\n';
        html += '        .summary-cards {\n';
        html += '            display: grid;\n';
        html += '            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n';
        html += '            gap: 20px;\n';
        html += '            margin-bottom: 40px;\n';
        html += '        }\n';
        html += '        .card {\n';
        html += '            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);\n';
        html += '            padding: 30px;\n';
        html += '            border-radius: 12px;\n';
        html += '            text-align: center;\n';
        html += '            box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n';
        html += '        }\n';
        html += '        .card .number {\n';
        html += '            font-size: 48px;\n';
        html += '            font-weight: 700;\n';
        html += '            color: #667eea;\n';
        html += '            margin-bottom: 10px;\n';
        html += '        }\n';
        html += '        .card .label {\n';
        html += '            font-size: 14px;\n';
        html += '            color: #666;\n';
        html += '            text-transform: uppercase;\n';
        html += '            letter-spacing: 1px;\n';
        html += '        }\n';
        html += '        .section {\n';
        html += '            margin-bottom: 40px;\n';
        html += '        }\n';
        html += '        .section h2 {\n';
        html += '            font-size: 24px;\n';
        html += '            color: #333;\n';
        html += '            margin-bottom: 20px;\n';
        html += '            padding-bottom: 10px;\n';
        html += '            border-bottom: 3px solid #667eea;\n';
        html += '        }\n';
        html += '        table {\n';
        html += '            width: 100%;\n';
        html += '            border-collapse: collapse;\n';
        html += '            margin-top: 20px;\n';
        html += '        }\n';
        html += '        th, td {\n';
        html += '            padding: 15px;\n';
        html += '            text-align: left;\n';
        html += '            border-bottom: 1px solid #eee;\n';
        html += '        }\n';
        html += '        th {\n';
        html += '            background: #f8f9fa;\n';
        html += '            color: #667eea;\n';
        html += '            font-weight: 600;\n';
        html += '            text-transform: uppercase;\n';
        html += '            font-size: 12px;\n';
        html += '            letter-spacing: 1px;\n';
        html += '        }\n';
        html += '        tr:hover {\n';
        html += '            background: #f8f9fa;\n';
        html += '        }\n';
        html += '        .footer {\n';
        html += '            text-align: center;\n';
        html += '            padding: 20px;\n';
        html += '            color: #999;\n';
        html += '            font-size: 14px;\n';
        html += '            border-top: 1px solid #eee;\n';
        html += '        }\n';
        html += '    </style>\n';
        html += '</head>\n';
        html += '<body>\n';
        html += '    <div class="container">\n';
        html += '        <div class="header">\n';
        html += '            <h1>🎯 MoE Data Extraction Report</h1>\n';
        html += '            <p class="timestamp">Generated: ' + new Date(report.extraction_timestamp).toLocaleString() + '</p>\n';
        html += '        </div>\n';
        html += '        <div class="content">\n';

        // Only show inference time and training time - centered
        if (report.inference_time_ms !== null || report.training_time_hours !== null) {
            html += '            <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 40px; flex-wrap: wrap;">\n';

            if (report.inference_time_ms !== null) {
                html += '                <div class="card" style="min-width: 250px;">\n';
                html += '                    <div class="number">' + report.inference_time_ms.toFixed(1) + 'ms</div>\n';
                html += '                    <div class="label">Inference Time</div>\n';
                html += '                </div>\n';
            }

            if (report.training_time_hours !== null) {
                html += '                <div class="card" style="min-width: 250px;">\n';
                html += '                    <div class="number">' + report.training_time_hours.toFixed(1) + 'h</div>\n';
                html += '                    <div class="label">Training Time</div>\n';
                html += '                </div>\n';
            }

            html += '            </div>\n';
        }

        // Router information
        if (report.routers.length > 0) {
            html += '            <div class="section">\n';
            html += '                <h2>📡 Router Configuration</h2>\n';
            html += '                <table>\n';
            html += '                    <thead>\n';
            html += '                        <tr>\n';
            html += '                            <th>Router Name</th>\n';
            html += '                            <th>meta_top_k</th>\n';
            html += '                        </tr>\n';
            html += '                    </thead>\n';
            html += '                    <tbody>\n';
            report.routers.forEach(function (router) {
                html += '                        <tr>\n';
                html += '                            <td>' + router.name + '</td>\n';
                html += '                            <td><strong>' + router.meta_top_k + '</strong></td>\n';
                html += '                        </tr>\n';
            });
            html += '                    </tbody>\n';
            html += '                </table>\n';
            html += '            </div>\n';
        }

        // Dataset information
        if (report.datasets.length > 0) {
            html += '            <div class="section">\n';
            html += '                <h2>📊 Dataset Information</h2>\n';
            html += '                <table>\n';
            html += '                    <thead>\n';
            html += '                        <tr>\n';
            html += '                            <th>Dataset Name</th>\n';
            html += '                            <th>Type</th>\n';
            html += '                            <th>Training Samples</th>\n';
            html += '                            <th>Test Samples</th>\n';
            html += '                        </tr>\n';
            html += '                    </thead>\n';
            html += '                    <tbody>\n';
            report.datasets.forEach(function (dataset) {
                html += '                        <tr>\n';
                html += '                            <td><strong>' + dataset.name + '</strong></td>\n';
                html += '                            <td>' + (dataset.dataset_type || 'N/A') + '</td>\n';
                html += '                            <td>' + (dataset.num_training_samples || 'N/A').toLocaleString() + '</td>\n';
                html += '                            <td>' + (dataset.num_test_samples || 'N/A').toLocaleString() + '</td>\n';
                html += '                        </tr>\n';
            });
            html += '                    </tbody>\n';
            html += '                </table>\n';
            html += '            </div>\n';
        }

        // Time Analysis Section
        if (report.inference_time_ms !== null || report.training_time_minutes !== null) {
            html += '            <div class="section">\n';
            html += '                <h2>⏱️ Time Analysis</h2>\n';
            html += '                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">\n';
            html += '                    <p style="color: #856404; margin: 0; font-size: 14px;"><strong>⚙️ Hardware/Software Assumptions:</strong> Time estimates are based on the following environment:</p>\n';
            html += '                    <ul style="color: #856404; margin: 10px 0 0 20px; font-size: 13px; line-height: 1.8;">\n';
            html += '                        <li><strong>CPU:</strong> Intel Core i7-14700K (20 cores, 28 threads)</li>\n';
            html += '                        <li><strong>GPU:</strong> NVIDIA GeForce RTX 4060 (8GB GDDR6)</li>\n';
            html += '                        <li><strong>RAM:</strong> 64GB DDR5-5600</li>\n';
            html += '                        <li><strong>Storage:</strong> 2TB NVMe SSD</li>\n';
            html += '                        <li><strong>OS:</strong> Ubuntu 22.04.5 LTS</li>\n';
            html += '                        <li><strong>Python:</strong> 3.10</li>\n';
            html += '                        <li><strong>PyTorch:</strong> 2.1</li>\n';
            html += '                    </ul>\n';
            html += '                </div>\n';

            // Inference Time Details
            if (report.inference_time_ms !== null) {
                html += '                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">\n';
                html += '                    <h3 style="color: #667eea; margin-bottom: 15px;">Inference Time Estimation</h3>\n';
                html += '                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">\n';
                html += '                        <div>\n';
                html += '                            <p style="color: #666; margin-bottom: 5px;"><strong>Formula:</strong></p>\n';
                html += '                            <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; font-size: 14px;">L = 0.081 - 0.013B - 0.0085A + 0.0105AB</p>\n';
                html += '                        </div>\n';
                html += '                        <div>\n';
                html += '                            <p style="color: #666; margin-bottom: 5px;"><strong>Parameters:</strong></p>\n';
                html += '                            <p style="background: white; padding: 10px; border-radius: 4px;">A = ' + report.total_experts + ' experts<br>B = ' + (report.routers[0] ? report.routers[0].meta_top_k : 'N/A') + ' (top-k)</p>\n';
                html += '                        </div>\n';
                html += '                    </div>\n';
                html += '                    <div style="margin-top: 20px; text-align: center;">\n';
                html += '                        <div style="font-size: 36px; font-weight: bold; color: #667eea;">' + report.inference_time_ms.toFixed(2) + ' ms</div>\n';
                html += '                        <div style="color: #666; margin-top: 5px;">(' + report.inference_time_seconds.toFixed(6) + ' seconds)</div>\n';
                html += '                    </div>\n';
                html += '                </div>\n';
            }

            // Training Time Details
            if (report.training_time_minutes !== null) {
                html += '                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">\n';
                html += '                    <h3 style="color: #667eea; margin-bottom: 15px;">Training Time Estimation</h3>\n';
                html += '                    <div style="margin-bottom: 20px;">\n';
                html += '                        <p style="color: #666; margin-bottom: 5px;"><strong>Formula:</strong></p>\n';
                html += '                        <p style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; font-size: 14px;">T = Σ(0.00118 × I<sub>i</sub>) + T<sub>router</sub>(D)</p>\n';
                html += '                        <p style="color: #888; font-size: 12px; margin-top: 5px;">where T<sub>router</sub>(2) = 15 mins, T<sub>router</sub>(D>2) = 30D - 45 mins</p>\n';
                html += '                    </div>\n';

                // Training time breakdown table
                html += '                    <table style="margin-bottom: 20px; background: white;">\n';
                html += '                        <thead>\n';
                html += '                            <tr>\n';
                html += '                                <th>Component</th>\n';
                html += '                                <th style="text-align: right;">Time (minutes)</th>\n';
                html += '                            </tr>\n';
                html += '                        </thead>\n';
                html += '                        <tbody>\n';
                html += '                            <tr>\n';
                html += '                                <td>Expert Training</td>\n';
                html += '                                <td style="text-align: right;">' + report.expert_training_time_minutes.toFixed(2) + '</td>\n';
                html += '                            </tr>\n';
                html += '                            <tr>\n';
                html += '                                <td>Router Training (' + report.total_experts + ' experts)</td>\n';
                html += '                                <td style="text-align: right;">' + report.router_training_time_minutes.toFixed(2) + '</td>\n';
                html += '                            </tr>\n';
                html += '                            <tr style="font-weight: bold; background: #f8f9fa;">\n';
                html += '                                <td>Total Training Time</td>\n';
                html += '                                <td style="text-align: right;">' + report.training_time_minutes.toFixed(2) + '</td>\n';
                html += '                            </tr>\n';
                html += '                        </tbody>\n';
                html += '                    </table>\n';

                html += '                    <div style="text-align: center;">\n';
                html += '                        <div style="font-size: 36px; font-weight: bold; color: #667eea;">' + report.training_time_hours.toFixed(2) + ' hours</div>\n';
                html += '                        <div style="color: #666; margin-top: 5px;">(' + report.training_time_minutes.toFixed(2) + ' minutes)</div>\n';
                html += '                    </div>\n';
                html += '                </div>\n';
            }

            html += '            </div>\n';
        }

        html += '        </div>\n';
        html += '        <div class="footer">\n';
        html += '            Generated by WebGME ExtractMoEData Plugin\n';
        html += '        </div>\n';
        html += '    </div>\n';
        html += '</body>\n';
        html += '</html>';

        return html;
    };

    return ExtractMoEData;
});
