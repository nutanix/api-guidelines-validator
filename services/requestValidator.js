const _PATH_PATTERN = new RegExp(
  "/[a-z0-9-]+/v[a-z0-9][a-z0-9.]*/[a-z0-9-]+(/[a-z0-9-]+)*"
);

class RequestValidator {
  constructor(swaggerValidator) {
    this.swaggerValidator = swaggerValidator;
  }

  validate(req, error_grouping) {
    const reqPath = this.getRequestPath(req);
    const method = req.method;

    //Path validation
    if (!_PATH_PATTERN.test(reqPath)) {
      $.log(error_grouping, ERROR.API_REQ_INVALID_PATH, reqPath, method);
    }

    //Security header param check
    if (_.includes(["POST", "DELETE", "PUT", "PATCH"], req.method) &&
      !(req.headers["X-CSRF-Token"] || req.headers["X-XSRF-Token"])) {
        $.log(error_grouping, ERROR.API_REQ_MISSING_TOKEN, reqPath, method);
    }

    //Path check in document
    if(!this.swaggerValidator.hasPathInDoc(reqPath,method.toLowerCase())){
        $.log(error_grouping, ERROR.API_REQ_PATH_NOT_DOC, reqPath, method);
    }
  }


  getRequestPath(req){
    try {
      const reqPathData = new URL(req.url, true);
      return reqPathData.pathname
    } catch (error) {
      return req.url.split("?")[0];
    }
  }



  getSampleDoc(reqPathData, method){
    const successCode = method.toLowerCase()==='post'?'201':'200';
    const parameters = Object.keys(reqPathData.query).map(key=>{
      return {
        in: "query",
        name: key,
        description: "",
        required: true,
        type:'string'
      }
    });
    return JSON.stringify({
      [reqPathData.pathname]:{
        [method]:{
          summary:"A sample summery about the API",
          description: "A description",
          parameters,
          responses: {
            [successCode]: {
              "description": "description about this error code"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      }
    },null,4);
  }
}

module.exports = RequestValidator;
