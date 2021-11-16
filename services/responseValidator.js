/**
 * @class
 * @name ResponseValidator
 * 
 */
class ResponseValidator {
    
    constructor(swaggerValidator){
        this.swaggerValidator = swaggerValidator;
    }

    validate(proxyRes, req, res, error_group = {}){
        const contentType = proxyRes.headers['content-type'] && proxyRes.headers['content-type'].split(';')[0];
        const method = req.method.toLowerCase();
        const statusCode = proxyRes.statusCode;
        const [ path ] = _.compact(req.url.split('?'));


        let body = [];

        // Error code checking in swagger doc
        if(!this.swaggerValidator.hasStatusCodeInDoc(path, method,statusCode)){
            $.log(error_group, ERROR.API_RES_CODE_NOT_DOC,path,method,statusCode);
        }

        //Method header param check
        if(_.includes(["put", "patch"], method) && 
            statusCode === 202 &&
            !proxyRes.headers['Location']){
            
            $.log(error_group, ERROR.API_RES_LOC_HEADER_MISSING,path, method);
        } else if(method ==='post' && !proxyRes.headers['Location']){
            $.log(error_group, ERROR.API_RES_LOC_HEADER_MISSING,path, method);
        }


        proxyRes.on('data', (chunk)=>{
            body.push(chunk);
        });
        proxyRes.on('end', ()=>{
            body = Buffer.concat(body);
            let bodyJSON = {};
            try {
                bodyJSON = JSON.parse(body.toString());
            } catch (error) {
                $.log(error_group,ERROR.ERROR.API_RES_CONTENT_TYPE_NOT_MATCHING,path,method, contentType);
            }

            //Content type check with document
            if(!this.swaggerValidator.hasContentTypeInDoc(path, method,contentType)){

                $.log(error_group, ERROR.API_RES_CONTENT_TYPE_NOT_DOC,path, method,contentType);

            }else if(!this.swaggerValidator.hasContentMatchWithDoc(path, method, statusCode, contentType, bodyJSON)){
                // Content JSON schema validation with doc
                $.log(error_group, ERROR.API_RES_JSON_MISS_MATCH_DOC,path, method,bodyJSON);
            }

            $.printLog(error_group, path, method);

            _.each(proxyRes.headers,(value, key)=>{
                res.setHeader(key, value);
            });
            res.statusCode = statusCode;
            res.end(body);
        });
    }
}

module.exports = ResponseValidator;
