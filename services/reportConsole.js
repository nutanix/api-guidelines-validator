const fs = require('fs')
const moment = require('moment')
const PATH = __dirname+'/../report/report.json';

class ReportConsole {

    constructor(){
    }

    addLogData(error_grouping, path, method, success, code, data) {
        if(_.isEmpty(error_grouping)){
            error_grouping.method = method;
            error_grouping.path = path;
            error_grouping.success = success;
            error_grouping.timestamp = moment().format();
            error_grouping.service = 'API-guidelines-monitor';
            if (!success) {
                error_grouping.errors = [];
                error_grouping.level = 'error';
            } else {
                error_grouping.level = 'info';
            }
        }
        if (!success) {
            error_grouping.errors.push({
                code,
                message: (data && typeof data == 'Object') ? JSON.stringify(data) : data,
            });
        }
        return error_grouping;
    }

    logStaticErrors(error_code, path, method, data){
        const error_grouping = {};
        this.addLogData(error_grouping, path, method, false, error_code, data);
        console.error(JSON.stringify(error_grouping));
    }

    log(error_grouping, error_code, path, method, data){
        this.addLogData(error_grouping, path, method, false, error_code, data);
    }

    commit(){
        this.writting=true;
        fs.writeFile(PATH,JSON.stringify(this.error_grouping,null,4),(err)=>{
            this.writting=false;

            if(this.pending){
                this.pending =false;
                this.commit();
            }
        });
    }

    printLog(error_grouping, path, method) {
        if (!_.isEmpty(error_grouping)) {
            console.log(JSON.stringify(error_grouping));
        } else {
            this.addLogData(error_grouping, path, method, true);
            console.log(JSON.stringify(error_grouping));
        }
        
    }
}

module.exports = ReportConsole;
