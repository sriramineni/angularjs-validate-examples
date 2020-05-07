(() => {
    'use strict';

    const app = angular.module('app', [
        'ngMessages',
        'ui.validate'
    ]);

    /**
     * Example 1 - ugly manual validation
     */
    class BadController {
        constructor() {
            this.nameError = false;
            this.passError = false;
        }
        validateName() {
            // Not empty and letters only
            this.nameError = !this.name || !/^[a-zA-Z]+$/.test(this.name);
        }
        validatePass() {
            // At least 4 characters
            this.passError = !this.pass || this.pass.length < 4;
        }
        submit() {
            this.validateName();
            this.validatePass();
            if (this.nameError || this.passError) {
                return;
            }
            alert(`Submit ${this.name}/${this.pass}`);
        }
    }

    /**
     * Example 2 - built-in AngularJS validation tools
     */
    class BuiltinValidationController {
        submit() {
            alert(`Submit ${this.name}/${this.pass}`);
        }
    }

    /**
     * Example 3 - reusable custom validation directive
     */
    app.directive('nameBlackList', () => {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: (scope, element, attrs, controller) => {
                controller.$validators.forbiddenName = value => {
                    if (!value) {
                        return true;
                    }
                    const lowVal = String(value).toLowerCase();
                    return lowVal.indexOf('barack') === -1 && lowVal.indexOf('donald') === -1;
                };
            }
        };
    });

    class CustomValidatorController {
        submit() {
            alert(`Submit ${this.name}`);
        }
    }

    /**
     * Examples 4, 5 - one-occasion custom validation directive that takes verification function and the same results with `ui-validate`
     */
    app.directive('customValidationFunction', () => {
        return {
            restrict: 'A',
            require: 'ngModel',
            scope: {
                valFunc: '&customValidationFunction'
            },
            link: (scope, element, attrs, controller) => {
                const normalizedFunc = (modelValue, viewValue) => {
                    const $value = modelValue || viewValue;
                    return scope.valFunc({
                        $value
                    });
                };
                controller.$validators.customValidationFunction = normalizedFunc;
            }
        };
    });

    class OneOccasionFunctionDirectiveController {
        submit() {
            alert(`Submit ${this.name}`);
        }

        validationFunc($value) {
            if (!$value) {
                return true;
            }
            const lowVal = String($value).toLowerCase();
            return lowVal.indexOf('arnold') === -1 && lowVal.indexOf('sylvester') === -1;
        }
    }

    /**
     * Example 6 - handling back-end validation errors
     */
    class backendValidationCtrl {
        static get $inject() {
            return [
                'backendServiceMocker',
                '$q'
            ];    
        }
        
        constructor(backendServiceMocker, $q) {
            this.backendServiceMocker = backendServiceMocker;
            this.$q = $q;
        }
        
        submit() {
            if (this.form6.$invalid) {
                return this.$q.reject();
            }
            return this.backendServiceMocker.postTheObjectWithName({
                name_field: this.name_field
            })
                .then(() => alert(`Successfully submited ${this.name_field}`))
                .catch(errorResponse => {
                    this.serverErrorMessages = errorResponse.data;
                    this.backendServiceMocker.serverErrorsHelper(errorResponse, this.form6);           
                });
        }
    }
    
    class backendServiceMocker {
        static get $inject() {
            return [
                '$http',
                '$q'
            ];
        }
        
        constructor($http, $q) {
            this.$http = $http;
            this.$q = $q;
        }
        
        postTheObjectWithName(obj) {
            // $http request would go here in real life
            if (!obj || !obj.name_field || String(obj.name_field).toLowerCase() !== 'guido') {
                return this.$q.reject({
                    status: 400,
                    data: {
                        name_field: ['Guido is the real name only']
                    }
                });
            }
            return this.$q.resolve({
                status: 201
            });
        }
        
        /**
         * Usually this goes to dedicated helpers service
         */        
        serverErrorsHelper(errorResponse, formController) {                        
            switch (errorResponse.status) {
                case 400:
                    if (errorResponse.data.non_field_errors) {
                        formController.$setValidity('serverError', false);
                        formController.$setSubmitted();
                    }
                    Object.getOwnPropertyNames(errorResponse.data).forEach(field => {
                        // Check if form contains defined in error response control
                        // And if control has ng-model                        
                        if (field !== 'non_field_errors' &&
                            angular.isObject(formController[field]) &&
                            formController[field].hasOwnProperty('$modelValue')) {
                            formController[field].$setValidity('serverError', false);
                            formController[field].$setTouched();
                        } else {
                            console.error(`Unknown server error ${field}.`);
                        }
                    });
                    break;
                default:
                    console.error('Unknown server error response.');
                    return;
            }
        }
    }

    app.directive('serverValidation', () => {
        return {
            restrict: 'A',
            require: 'form',
            link: (scope, element, attrs, formController) => {
                const resetServerValidity = fieldController => {
                    const storedFieldController = fieldController;
                    return () => {
                        storedFieldController.$setValidity('serverError', true);
                        formController.$setValidity('serverError', true);
                        return true;
                    };
                };
                scope.$watchCollection(() => formController, updatedFormController => {                    
                    Object.getOwnPropertyNames(updatedFormController).forEach(field => {
                        // Search for form controls with ng-model controllers
                        // Which do not have attached server error resetter validator
                        if (angular.isObject(updatedFormController[field]) &&
                            updatedFormController[field].hasOwnProperty('$modelValue') &&
                            angular.isObject(updatedFormController[field].$validators) &&
                            !updatedFormController[field].$validators.hasOwnProperty('serverValidityResetter')) {
                            updatedFormController[field].$validators.serverValidityResetter = resetServerValidity(updatedFormController[field]);
                        }
                    });
                });
            }
        };
    });    
    
    app.controller('badCtrl', BadController);
    app.controller('builtinValidationCtrl', BuiltinValidationController);
    app.controller('customValidatorCtrl', CustomValidatorController);
    app.controller('oneOccasionFunctionDirectiveCtrl', OneOccasionFunctionDirectiveController);
    app.controller('backendValidationCtrl', backendValidationCtrl);

    app.service('backendServiceMocker', backendServiceMocker);
})();