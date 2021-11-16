const RequestValidator = require('./RequestValidator');
const ResponseValidator = require('./ResponseValidator');
const SwaggerValidator = require('./swaggerValidator');

class RuntimeValidator{

    constructor(){
        this.swaggerValidator = new SwaggerValidator();;
        this.requestValidator = new RequestValidator(this.swaggerValidator);
        this.responseValidator = new ResponseValidator(this.swaggerValidator);
    }

    validate(proxyRes, req, res){
        const error_group = {};
        this.requestValidator.validate(req, error_group);
        this.responseValidator.validate(proxyRes,req,res, error_group);
    }
}

module.exports = RuntimeValidator;