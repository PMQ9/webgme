/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * ExpertDecorator - Displays backbone layer details on expert nodes
 * @author MoE Research Team
 */

define([
    'js/Decorators/DecoratorBase',
    './DiagramDesigner/ExpertDecorator.DiagramDesignerWidget',
    './PartBrowser/ExpertDecorator.PartBrowserWidget'
], function (DecoratorBase, ExpertDecoratorDiagramDesignerWidget, ExpertDecoratorPartBrowserWidget) {

    'use strict';

    var ExpertDecorator,
        __parent__ = DecoratorBase,
        __parent_proto__ = DecoratorBase.prototype,
        DECORATOR_ID = 'ExpertDecorator';

    ExpertDecorator = function (params) {
        var opts = _.extend({loggerName: this.DECORATORID}, params);

        __parent__.apply(this, [opts]);

        this.logger.debug('ExpertDecorator ctor');
    };

    _.extend(ExpertDecorator.prototype, __parent_proto__);
    ExpertDecorator.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

    ExpertDecorator.prototype.initializeSupportedWidgetMap = function () {
        this.supportedWidgetMap = {
            DiagramDesigner: ExpertDecoratorDiagramDesignerWidget,
            PartBrowser: ExpertDecoratorPartBrowserWidget
        };
    };

    return ExpertDecorator;
});
