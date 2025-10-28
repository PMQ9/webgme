/*globals define*/
/*jshint node:true, browser:true*/

/**
 * MoE (Mixture-of-Experts) Metamodel Generator - Version 1
 *
 * This plugin creates a complete metamodel for Mixture-of-Experts architectures
 * used in the Vanderbilt ISIS safety-critical systems research.
 *
 * Metamodel includes:
 * - Expert architectures (ultra_verifiable_cnn, micro_cnn, tiny_cnn, small_cnn)
 * - Routers (MetaGatingNet)
 * - Datasets (GTSRB, CIFAR10, MNIST)
 * - MetaMoE containers
 * - Training configurations
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
     * Initializes a new instance of MoE_Metamodel_ver1.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin MoE_Metamodel_ver1.
     * @constructor
     */
    var MoE_Metamodel_ver1 = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, disableServerExecution etc.
     * @type {object}
     */
    MoE_Metamodel_ver1.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    MoE_Metamodel_ver1.prototype = Object.create(PluginBase.prototype);
    MoE_Metamodel_ver1.prototype.constructor = MoE_Metamodel_ver1;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    MoE_Metamodel_ver1.prototype.main = function (callback) {
        var self = this,
            core = self.core,
            rootNode = self.rootNode,
            META = self.META;

        self.logger.info('Creating MoE Metamodel ver1...');

        // Create base metamodel classes
        self.createMetamodel()
            .then(function () {
                self.logger.info('Metamodel created successfully!');
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                self.logger.error('Error creating metamodel:', err);
                self.result.setSuccess(false);
                callback(err, self.result);
            });
    };

    /**
     * Creates the complete MoE metamodel
     */
    MoE_Metamodel_ver1.prototype.createMetamodel = function () {
        var self = this,
            core = self.core,
            rootNode = self.rootNode,
            META = self.META;

        return core.loadChildren(rootNode)
            .then(function (children) {
                var baseNode = null,
                    i;

                // Find FCO (base for all objects)
                for (i = 0; i < children.length; i++) {
                    if (core.getAttribute(children[i], 'name') === 'FCO') {
                        baseNode = children[i];
                        break;
                    }
                }

                if (!baseNode) {
                    throw new Error('Could not find FCO base node');
                }

                // Create all metamodel elements
                return self.createAllMetaElements(baseNode);
            });
    };

    /**
     * Creates all metamodel elements
     */
    MoE_Metamodel_ver1.prototype.createAllMetaElements = function (baseNode) {
        var self = this,
            core = self.core,
            rootNode = self.rootNode,
            elements = {};

        self.logger.info('Creating metamodel base classes...');

        // 1. Create base MoE_System container
        elements.MoE_System = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.MoE_System, 'name', 'MoE_System');
        core.setRegistry(elements.MoE_System, 'isAbstract', false);
        core.setRegistry(elements.MoE_System, 'position', {x: 100, y: 100});

        // 2. Create ExpertModel base
        elements.ExpertModel = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.ExpertModel, 'name', 'ExpertModel');
        core.setRegistry(elements.ExpertModel, 'isAbstract', false);
        core.setAttribute(elements.ExpertModel, 'architecture', 'ultra_verifiable_cnn');
        core.setAttribute(elements.ExpertModel, 'num_params', 96000);
        core.setAttribute(elements.ExpertModel, 'frozen', false);
        core.setAttribute(elements.ExpertModel, 'accuracy', 0.0);
        core.setAttribute(elements.ExpertModel, 'model_path', '');
        core.setRegistry(elements.ExpertModel, 'position', {x: 300, y: 100});

        // 3. Create specific expert architectures
        // UltraVerifiableCNN Expert
        elements.UltraVerifiableCNN_Expert = core.createNode({
            parent: rootNode,
            base: elements.ExpertModel
        });
        core.setAttribute(elements.UltraVerifiableCNN_Expert, 'name', 'UltraVerifiableCNN_Expert');
        core.setAttribute(elements.UltraVerifiableCNN_Expert, 'architecture', 'ultra_verifiable_cnn');
        core.setAttribute(elements.UltraVerifiableCNN_Expert, 'num_params', 96000);
        core.setRegistry(elements.UltraVerifiableCNN_Expert, 'position', {x: 300, y: 200});

        // MicroCNN Expert
        elements.MicroCNN_Expert = core.createNode({
            parent: rootNode,
            base: elements.ExpertModel
        });
        core.setAttribute(elements.MicroCNN_Expert, 'name', 'MicroCNN_Expert');
        core.setAttribute(elements.MicroCNN_Expert, 'architecture', 'micro_cnn');
        core.setAttribute(elements.MicroCNN_Expert, 'num_params', 67000);
        core.setRegistry(elements.MicroCNN_Expert, 'position', {x: 300, y: 300});

        // TinyCNN Expert
        elements.TinyCNN_Expert = core.createNode({
            parent: rootNode,
            base: elements.ExpertModel
        });
        core.setAttribute(elements.TinyCNN_Expert, 'name', 'TinyCNN_Expert');
        core.setAttribute(elements.TinyCNN_Expert, 'architecture', 'tiny_cnn');
        core.setAttribute(elements.TinyCNN_Expert, 'num_params', 620000);
        core.setRegistry(elements.TinyCNN_Expert, 'position', {x: 300, y: 400});

        // SmallCNN Expert
        elements.SmallCNN_Expert = core.createNode({
            parent: rootNode,
            base: elements.ExpertModel
        });
        core.setAttribute(elements.SmallCNN_Expert, 'name', 'SmallCNN_Expert');
        core.setAttribute(elements.SmallCNN_Expert, 'architecture', 'small_cnn');
        core.setAttribute(elements.SmallCNN_Expert, 'num_params', 1500000);
        core.setRegistry(elements.SmallCNN_Expert, 'position', {x: 300, y: 500});

        // 4. Create Router
        elements.Router = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.Router, 'name', 'Router');
        core.setAttribute(elements.Router, 'backbone_arch', 'ultra_verifiable_cnn');
        core.setAttribute(elements.Router, 'top_k', 1);
        core.setAttribute(elements.Router, 'temperature', 1.0);
        core.setAttribute(elements.Router, 'num_experts', 2);
        core.setRegistry(elements.Router, 'position', {x: 500, y: 100});

        // 5. Create Dataset types
        elements.Dataset = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.Dataset, 'name', 'Dataset');
        core.setAttribute(elements.Dataset, 'dataset_name', 'GTSRB');
        core.setAttribute(elements.Dataset, 'num_classes', 43);
        core.setAttribute(elements.Dataset, 'meta_class_id', 0);
        core.setAttribute(elements.Dataset, 'img_size', 32);
        core.setRegistry(elements.Dataset, 'position', {x: 700, y: 100});

        // GTSRB Dataset
        elements.GTSRB_Dataset = core.createNode({
            parent: rootNode,
            base: elements.Dataset
        });
        core.setAttribute(elements.GTSRB_Dataset, 'name', 'GTSRB_Dataset');
        core.setAttribute(elements.GTSRB_Dataset, 'dataset_name', 'GTSRB');
        core.setAttribute(elements.GTSRB_Dataset, 'num_classes', 43);
        core.setAttribute(elements.GTSRB_Dataset, 'meta_class_id', 0);
        core.setRegistry(elements.GTSRB_Dataset, 'position', {x: 700, y: 200});

        // CIFAR10 Dataset
        elements.CIFAR10_Dataset = core.createNode({
            parent: rootNode,
            base: elements.Dataset
        });
        core.setAttribute(elements.CIFAR10_Dataset, 'name', 'CIFAR10_Dataset');
        core.setAttribute(elements.CIFAR10_Dataset, 'dataset_name', 'CIFAR10');
        core.setAttribute(elements.CIFAR10_Dataset, 'num_classes', 10);
        core.setAttribute(elements.CIFAR10_Dataset, 'meta_class_id', 1);
        core.setRegistry(elements.CIFAR10_Dataset, 'position', {x: 700, y: 300});

        // MNIST Dataset
        elements.MNIST_Dataset = core.createNode({
            parent: rootNode,
            base: elements.Dataset
        });
        core.setAttribute(elements.MNIST_Dataset, 'name', 'MNIST_Dataset');
        core.setAttribute(elements.MNIST_Dataset, 'dataset_name', 'MNIST');
        core.setAttribute(elements.MNIST_Dataset, 'num_classes', 10);
        core.setAttribute(elements.MNIST_Dataset, 'meta_class_id', 2);
        core.setRegistry(elements.MNIST_Dataset, 'position', {x: 700, y: 400});

        // 6. Create MetaMoE container
        elements.MetaMoE = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.MetaMoE, 'name', 'MetaMoE');
        core.setAttribute(elements.MetaMoE, 'model_path', '');
        core.setAttribute(elements.MetaMoE, 'router_accuracy', 0.0);
        core.setAttribute(elements.MetaMoE, 'overall_accuracy', 0.0);
        core.setRegistry(elements.MetaMoE, 'position', {x: 900, y: 100});

        // 7. Create TrainingConfig
        elements.TrainingConfig = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.TrainingConfig, 'name', 'TrainingConfig');
        core.setAttribute(elements.TrainingConfig, 'epochs', 100);
        core.setAttribute(elements.TrainingConfig, 'batch_size', 64);
        core.setAttribute(elements.TrainingConfig, 'learning_rate', 0.001);
        core.setAttribute(elements.TrainingConfig, 'adv_training', false);
        core.setAttribute(elements.TrainingConfig, 'adv_mode', 'PGD');
        core.setAttribute(elements.TrainingConfig, 'trades_beta', 6.0);
        core.setRegistry(elements.TrainingConfig, 'position', {x: 900, y: 300});

        // 8. Create Connection types (relationships)

        // TrainedOn: Expert -> Dataset
        elements.TrainedOn = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.TrainedOn, 'name', 'TrainedOn');
        core.setRegistry(elements.TrainedOn, 'isConnection', true);
        core.setRegistry(elements.TrainedOn, 'position', {x: 500, y: 300});

        // RoutesTo: Router -> Expert
        elements.RoutesTo = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.RoutesTo, 'name', 'RoutesTo');
        core.setRegistry(elements.RoutesTo, 'isConnection', true);
        core.setAttribute(elements.RoutesTo, 'routing_score', 0.0);
        core.setRegistry(elements.RoutesTo, 'position', {x: 500, y: 400});

        // UsesConfig: MetaMoE -> TrainingConfig
        elements.UsesConfig = core.createNode({
            parent: rootNode,
            base: baseNode
        });
        core.setAttribute(elements.UsesConfig, 'name', 'UsesConfig');
        core.setRegistry(elements.UsesConfig, 'isConnection', true);
        core.setRegistry(elements.UsesConfig, 'position', {x: 500, y: 500});

        self.logger.info('Created ' + Object.keys(elements).length + ' metamodel elements');

        // Add all elements to Meta aspect
        self.addElementsToMetaAspect(elements);

        // Set containment rules
        self.setContainmentRules(elements);

        self.logger.info('Metamodel elements created, now saving...');
        // Save the changes to the database
        return self.save('Created MoE metamodel with ' + Object.keys(elements).length + ' elements');
    };

    /**
     * Adds all metamodel elements to the MetaAspectSet so they appear in the Meta Editor
     */
    MoE_Metamodel_ver1.prototype.addElementsToMetaAspect = function (elements) {
        var self = this,
            core = self.core,
            rootNode = self.rootNode,
            positions = {
                // Layout positions for Meta view (arrange in a grid)
                MoE_System: {x: 100, y: 100},
                ExpertModel: {x: 300, y: 100},
                UltraVerifiableCNN_Expert: {x: 300, y: 200},
                MicroCNN_Expert: {x: 300, y: 300},
                TinyCNN_Expert: {x: 300, y: 400},
                SmallCNN_Expert: {x: 300, y: 500},
                Router: {x: 500, y: 100},
                Dataset: {x: 700, y: 100},
                GTSRB_Dataset: {x: 700, y: 200},
                CIFAR10_Dataset: {x: 700, y: 300},
                MNIST_Dataset: {x: 700, y: 400},
                MetaMoE: {x: 900, y: 100},
                TrainingConfig: {x: 900, y: 300},
                TrainedOn: {x: 500, y: 300},
                RoutesTo: {x: 500, y: 400},
                UsesConfig: {x: 500, y: 500}
            },
            key, pos;

        self.logger.info('Adding elements to MetaAspectSet...');

        // Add each element to the MetaAspectSet
        for (key in elements) {
            if (elements.hasOwnProperty(key)) {
                self.logger.info('Adding ' + key + ' to MetaAspectSet');
                core.addMember(rootNode, 'MetaAspectSet', elements[key]);
                pos = positions[key] || {x: 100, y: 100};
                core.setMemberRegistry(rootNode, 'MetaAspectSet', core.getPath(elements[key]), 'x', pos.x);
                core.setMemberRegistry(rootNode, 'MetaAspectSet', core.getPath(elements[key]), 'y', pos.y);
            }
        }

        self.logger.info('Successfully added ' + Object.keys(elements).length + ' elements to MetaAspectSet');
    };

    /**
     * Sets containment rules for the metamodel
     */
    MoE_Metamodel_ver1.prototype.setContainmentRules = function (elements) {
        var self = this,
            core = self.core,
            rootNode = self.rootNode;

        self.logger.info('Setting containment rules...');

        // Make metamodel elements available in Part Browser by adding to ROOT
        // Allow MoE_System to be created at root level
        core.setChildMeta(rootNode, elements.MoE_System, 0, -1);

        // Make all main types creatable (will show in Part Browser when MoE_System is selected)
        core.setChildMeta(rootNode, elements.MetaMoE, 0, -1);
        core.setChildMeta(rootNode, elements.ExpertModel, 0, -1);
        core.setChildMeta(rootNode, elements.UltraVerifiableCNN_Expert, 0, -1);
        core.setChildMeta(rootNode, elements.MicroCNN_Expert, 0, -1);
        core.setChildMeta(rootNode, elements.TinyCNN_Expert, 0, -1);
        core.setChildMeta(rootNode, elements.SmallCNN_Expert, 0, -1);
        core.setChildMeta(rootNode, elements.Router, 0, -1);
        core.setChildMeta(rootNode, elements.Dataset, 0, -1);
        core.setChildMeta(rootNode, elements.GTSRB_Dataset, 0, -1);
        core.setChildMeta(rootNode, elements.CIFAR10_Dataset, 0, -1);
        core.setChildMeta(rootNode, elements.MNIST_Dataset, 0, -1);
        core.setChildMeta(rootNode, elements.TrainingConfig, 0, -1);
        core.setChildMeta(rootNode, elements.TrainedOn, 0, -1);
        core.setChildMeta(rootNode, elements.RoutesTo, 0, -1);
        core.setChildMeta(rootNode, elements.UsesConfig, 0, -1);

        // MoE_System can contain: MetaMoE, ExpertModel, Router, Dataset, TrainingConfig
        core.setChildMeta(elements.MoE_System, elements.MetaMoE, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.ExpertModel, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.UltraVerifiableCNN_Expert, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.MicroCNN_Expert, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.TinyCNN_Expert, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.SmallCNN_Expert, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.Router, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.Dataset, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.GTSRB_Dataset, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.CIFAR10_Dataset, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.MNIST_Dataset, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.TrainingConfig, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.TrainedOn, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.RoutesTo, 0, -1);
        core.setChildMeta(elements.MoE_System, elements.UsesConfig, 0, -1);

        // MetaMoE can contain: Router and Experts
        core.setChildMeta(elements.MetaMoE, elements.Router, 1, 1); // exactly 1 router
        core.setChildMeta(elements.MetaMoE, elements.ExpertModel, 2, -1); // at least 2 experts
        core.setChildMeta(elements.MetaMoE, elements.UltraVerifiableCNN_Expert, 0, -1);
        core.setChildMeta(elements.MetaMoE, elements.MicroCNN_Expert, 0, -1);
        core.setChildMeta(elements.MetaMoE, elements.TinyCNN_Expert, 0, -1);
        core.setChildMeta(elements.MetaMoE, elements.SmallCNN_Expert, 0, -1);

        // Set pointer meta (connections)
        // TrainedOn: src=ExpertModel, dst=Dataset
        core.setPointerMetaTarget(elements.TrainedOn, 'src', elements.ExpertModel, 1, 1);
        core.setPointerMetaTarget(elements.TrainedOn, 'dst', elements.Dataset, 1, 1);

        // RoutesTo: src=Router, dst=ExpertModel
        core.setPointerMetaTarget(elements.RoutesTo, 'src', elements.Router, 1, 1);
        core.setPointerMetaTarget(elements.RoutesTo, 'dst', elements.ExpertModel, 1, 1);

        // UsesConfig: src=MetaMoE, dst=TrainingConfig
        core.setPointerMetaTarget(elements.UsesConfig, 'src', elements.MetaMoE, 1, 1);
        core.setPointerMetaTarget(elements.UsesConfig, 'dst', elements.TrainingConfig, 1, 1);

        self.logger.info('Containment rules set successfully');
    };

    return MoE_Metamodel_ver1;
});
