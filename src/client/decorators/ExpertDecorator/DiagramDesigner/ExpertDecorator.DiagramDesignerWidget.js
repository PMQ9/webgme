/*globals define, _*/
/*jshint browser: true*/

/**
 * Expert Decorator DiagramDesigner Widget
 * @author MoE Research Team
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'decorators/ModelDecorator/DiagramDesigner/ModelDecorator.DiagramDesignerWidget',
    'text!../Core/ExpertDecorator.html',
    '../Core/ExpertDecorator.Core',
    'css!./ExpertDecorator.DiagramDesignerWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             ModelDecoratorDiagramDesignerWidget,
             expertDecoratorTemplate,
             ExpertDecoratorCore) {

    'use strict';

    var ExpertDecoratorDiagramDesignerWidget,
        DECORATOR_ID = 'ExpertDecoratorDiagramDesignerWidget';

    ExpertDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend({}, options);

        ModelDecoratorDiagramDesignerWidget.call(this, opts);
        ExpertDecoratorCore.call(this, opts);

        this.logger.debug('ExpertDecoratorDiagramDesignerWidget ctor');
    };

    _.extend(ExpertDecoratorDiagramDesignerWidget.prototype, ModelDecoratorDiagramDesignerWidget.prototype);
    _.extend(ExpertDecoratorDiagramDesignerWidget.prototype, ExpertDecoratorCore.prototype);

    ExpertDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;

    // Override the template
    ExpertDecoratorDiagramDesignerWidget.prototype.$DOMBase = $(expertDecoratorTemplate);

    return ExpertDecoratorDiagramDesignerWidget;
});
