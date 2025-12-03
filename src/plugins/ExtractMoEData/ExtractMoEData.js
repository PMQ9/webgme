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
    'plugin/PluginBase'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase) {
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

            // Save report as JSON artifact
            var reportJson = JSON.stringify(report, null, 2);
            self.logger.info('Full Report:\n' + reportJson);

            // Create and save the artifact
            self.blobClient.putFile('moe_extraction_report.json', reportJson)
                .then(function (hash) {
                    self.result.addArtifact(hash);
                    self.logger.info('Report saved as artifact: moe_extraction_report.json');
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

    return ExtractMoEData;
});
