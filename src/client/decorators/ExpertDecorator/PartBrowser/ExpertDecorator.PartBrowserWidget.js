/*globals define, _*/
/*jshint browser: true*/

/**
 * Expert Decorator PartBrowser Widget
 * @author MoE Research Team
 */

define([
    'decorators/ModelDecorator/PartBrowser/ModelDecorator.PartBrowserWidget',
    'text!../Core/ExpertDecorator.html',
    '../Core/ExpertDecorator.Core',
    'css!./ExpertDecorator.PartBrowserWidget.css'
], function (ModelDecoratorPartBrowserWidget,
             expertDecoratorTemplate,
             ExpertDecoratorCore) {

    'use strict';

    var ExpertDecoratorPartBrowserWidget,
        DECORATOR_ID = 'ExpertDecoratorPartBrowserWidget';

    ExpertDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        ModelDecoratorPartBrowserWidget.call(this, opts);
        ExpertDecoratorCore.call(this, opts);

        this.logger.debug('ExpertDecoratorPartBrowserWidget ctor');
    };

    _.extend(ExpertDecoratorPartBrowserWidget.prototype, ModelDecoratorPartBrowserWidget.prototype);
    _.extend(ExpertDecoratorPartBrowserWidget.prototype, ExpertDecoratorCore.prototype);

    ExpertDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    // Override the template
    ExpertDecoratorPartBrowserWidget.prototype.$DOMBase = $(expertDecoratorTemplate);

    return ExpertDecoratorPartBrowserWidget;
});
