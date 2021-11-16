const SwaggerParser = require('@apidevtools/swagger-parser');
const fetch = require('node-fetch');
const ec = require('./errorCodes');
const JsonSchemaValidator = require('jsonschema').Validator;

class SwaggerValidator {

    constructor() {
        if (!process.env.DOC_TARGET) {
            throw new Error('Invalid swagger documentation file path. env DOC_TARGET=<file URI>');
        }
        this.doc = null;
        this.pathMap = {};
        this.schemaValidator = new JsonSchemaValidator();
        this.schemaMap = {};

        SwaggerParser.parse(`${process.env.TARGET}${process.env.DOC_TARGET}`, (err, doc) => {
            if (err) {
                throw new Error(err);
            } else {
                this.doc = doc;
                this.init();
            }
        })
    }

    init() {
        if (this.doc) {
            _.each(this.doc.paths, (ref, path) => {
                const fullPath = (`${process.env.TARGET}${path}`);
                const { get, put, patch, post, delete: del } = ref;
                const respGetStruct = this.valiateGet(get, fullPath);
                this.valiateDel(del, fullPath);
                this.valiatePost(post, fullPath);
                this.valiatePatch(patch, fullPath, respGetStruct);
                this.valiatePut(put, fullPath, respGetStruct);
                this.addPathToMap(path, {
                    get,
                    put,
                    patch,
                    post,
                    delete: del
                });
            });
            _.each(this.doc.definitions, (schemaDefinition, schemaName) => {
                if (!schemaDefinition.id) {
                    schemaDefinition.id = `#/definitions/${schemaName}`;
                }
                this.schemaValidator.addSchema(schemaDefinition);
                this.schemaMap[schemaDefinition.id] = schemaDefinition;
            });
        }
    }

    addPathToMap(path, data) {
        const splitPath = path.substr(1, path.length).split("/");
        const leafNode = splitPath.reduce((pathMap, pathFragment) => {
            let key = pathFragment;
            if (/\{.*\}/.test(pathFragment)) {
                key = '__PARAMETER';
            }
            if (!pathMap[key]) {
                pathMap[key] = {};
            }
            return pathMap[key];
        }, this.pathMap);
        leafNode.$data = data;
    }


    valiateGet(ref, path) {
        if (!ref) return;
        let respStruct = null;
        if (!ref.responses) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'GET');
        } else if (!ref.responses["200"]) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'GET', this.getErrorCodeDetails('GET'));
        } else {
            respStruct = this.getResponseScehma(ref);
        }
        return respStruct;
    }

    valiatePost(ref, path) {
        if (!ref) return;

        if (!ref.responses) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'POST');
        } else if (!ref.responses["201"] && !ref.responses["202"]) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'POST', this.getErrorCodeDetails('POST'));
        }
    }

    valiatePut(ref, path, respGetStruct) {
        if (!ref) return;

        if (!ref.responses) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'PUT');
        } else if (!ref.responses["200"] && !ref.responses["202"]) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'PUT', this.getErrorCodeDetails('PUT'));
        } else {
            const respPutStruct = this.getResponseScehma(ref);
            if (respPutStruct) {
                if (respGetStruct.ref && !respPutStruct.ref) {
                    $.logStaticErrors(ec.DOC_MISS_MATCH_RESP_SCHEMA, path, 'PUT', respGetStruct.ref);
                } else if (!this.compareJsonStructure(respGetStruct.json, respPutStruct.json)) {
                    $.logStaticErrors(ec.DOC_MISS_MATCH_RESP_JSON, path, 'PUT');
                }
            } else {
                $.logStaticErrors(ec.DOC_MISSING_RESP_SCHEMA, path, 'PUT');
            }
        }
    }

    valiateDel(ref, path) {
        if (!ref) return;

        if (!ref.responses) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'DELETE');
        } else if (!ref.responses["204"] && !ref.responses["202"]) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'DELETE', this.getErrorCodeDetails('DELETE'));
        }
    }

    valiatePatch(ref, path, respGetStruct) {
        if (!ref) return;

        if (!ref.responses) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'PATCH');
        } else if (!ref.responses["200"] && !ref.responses["202"]) {
            $.logStaticErrors(ec.DOC_MISSING_STATUS_CODE, path, 'PATCH', this.getErrorCodeDetails('PATCH'));
        } else {
            // if it has 200 success then it should have the same reference as GET call
            if (ref.responses["200"]) {
                const respPatchStruct = this.getResponseScehma(ref);
                if (respPatchStruct) {
                    if (respGetStruct.ref && !respPatchStruct.ref) {
                        $.logStaticErrors(ec.DOC_MISS_MATCH_RESP_SCHEMA, path, 'PATCH', respGetStruct.ref);
                    } else if (!this.compareJsonStructure(respGetStruct.json, respPatchStruct.json)) {
                        $.logStaticErrors(ec.DOC_MISS_MATCH_RESP_JSON, path, 'PATCH');
                    }
                } else {
                    $.logStaticErrors(ec.DOC_MISSING_RESP_SCHEMA, path, 'PATCH');
                }
            }
        }
    }

    getResponseScehma(ref, code = "200") {
        const respStruct = {};
        // checking for v3 version for ref
        let jsonResp = ref.responses[code] && ref.responses[code].content && ref.responses[code].content["application/json"];
        if (!jsonResp) {
            jsonResp = ref.responses[code] && ref.responses[code];
        }
        respStruct.ref = (jsonResp && jsonResp.schema && jsonResp.schema["$ref"]) || null;

        if (!respStruct.ref) {
            respStruct.json = jsonResp;
        }
        return respStruct;
    }

    compareJsonStructure(source, target) {
        return _.isEqual(source, target);
    }

    getErrorCodeDetails(method) {
        const expectmap = {
            'GET': {
                code: '200',
                desc: 'GET method should return HTTP 200 code for success response.'
            },
            'DELETE': {
                code: '204/202',
                desc: 'DELETE method should return HTTP 204 for sync and 202 for async success code.'
            },
            'PATCH': {
                code: '200/202',
                desc: 'PATCH method should return HTTP 200 for sync and 202 for async success code.'
            },
            'PUT': {
                code: '200/202',
                desc: 'PUT method should return HTTP 200 for sync and 202 for async success code.'
            },
            'POST': {
                code: '201/202',
                desc: 'POST method should return HTTP 201 for sync and 202 for async success code.'
            }
        }
        return {
            expect: expectmap[method].code,
            desc: expectmap[method].desc
        }
    }

    getDocByPath(path, method) {
        if (path.indexOf("/") == 0) {
            path = path.substr(1, path.length);
        }
        const splitPath = path.split("/");
        const parameters = [];
        const leafNode = splitPath.reduce((pathMap, pathFragment) => {
            if(!pathMap) {
                return;
            }
            let key = pathFragment;
            if (!pathMap[key]) {
                key = '__PARAMETER';
                parameters.push(pathFragment);
            }
            return pathMap[key] || null;
        }, this.pathMap);
        if (leafNode) {
            const data = leafNode.$data;
            if (data && data[method]) {
                if (parameters.length > 0) {
                    if (data[method].parameters) {
                        let invalidPath = false;
                        const pathProperties = _.filter(data[method].parameters, parameter => parameter.in === 'path');
                        _.each(parameters, (parameter, index) => {
                            if (index >= pathProperties.length) {
                                invalidPath = true;
                            } else {
                                const parameterProperties = pathProperties[index];
                                if (parameterProperties.type === 'integer') {
                                    if (!(/\d+/.test(parameter))) {
                                        invalidPath = true;
                                    }
                                } else if (parameterProperties.type === 'string') {
                                    if (!(/\w+/.test(parameter))) {
                                        invalidPath = true;
                                    }
                                }
                            }
                        });
                        if (invalidPath) {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
                return data;
            }
        }
        return null;
    }
    hasPathInDoc(path, method) {
        const doc = this.getDocByPath(path, method);
        return doc?true:false;
    }

    hasContentTypeInDoc(path, method, type) {
        const doc = this.getDocByPath(path, method);
        return (doc && doc[method] && _.includes(doc[method].produces, type));
    }

    hasStatusCodeInDoc(path, method, code) {
        const doc = this.getDocByPath(path, method);
        if(doc && doc[method] && doc[method].responses[code]){
            return true;
        }
        return false;
    }

    hasContentMatchWithDoc(path, method, code, type, json) {
        if (type === 'application/json') {
            if (this.hasStatusCodeInDoc(path, method, code)) {
                const doc = this.getDocByPath(path, method);
                const ref = doc[method];
                const responseStruct = this.getResponseScehma(ref, code);
                if (responseStruct) {
                    if (responseStruct.ref) {
                        return this.schemaValidator.validate(json, this.schemaMap[responseStruct.ref]);
                    } else if (responseStruct.json) {
                        return this.compareJsonStructure(json, responseStruct.json);
                    }
                }
            }
            return false;
        }
        return true;
    }
}

module.exports = SwaggerValidator;
