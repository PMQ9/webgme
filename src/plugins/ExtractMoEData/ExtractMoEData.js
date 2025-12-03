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
        html += '            <div class="summary-cards">\n';
        html += '                <div class="card">\n';
        html += '                    <div class="number">' + report.total_experts + '</div>\n';
        html += '                    <div class="label">Total Experts</div>\n';
        html += '                </div>\n';
        html += '                <div class="card">\n';
        html += '                    <div class="number">' + report.routers.length + '</div>\n';
        html += '                    <div class="label">Routers</div>\n';
        html += '                </div>\n';
        html += '                <div class="card">\n';
        html += '                    <div class="number">' + report.total_datasets + '</div>\n';
        html += '                    <div class="label">Datasets</div>\n';
        html += '                </div>\n';
        html += '            </div>\n';

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
