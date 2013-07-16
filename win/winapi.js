//Contains all the possible calls to global WIN
//comes with a version number for the API -- to know which version of the API it's designed for

//make some ajax calls here


(function(exports, selfBrowser, isBrowser){

    var winapi = exports;

    var http = isBrowser ? null : require('http');

    //need to set some standard ajax calls to the configured WIN global locaion
    //OR write to file

    //win object

    var winInstance = null;

    //single instance of win api -- for calling out to WIN
    winapi.GlobalWINApi = function()
    {
        if(!winInstance)
            winInstance = new winapi.WinObject();

        return winInstance;
    };

    winapi.winHost = '';
    winapi.winPort = '';

    winapi.winServerRequest = function(path)
    {
        return winapi.generalServerRequest(winapi.winHost, winapi.winPort, path, 'GET');
    };

    winapi.winServerPost = function(path)
    {
        return winapi.generalServerRequest(winapi.winHost, winapi.winPort, path, 'POST');
    };

    winapi.generalServerRequest = function(host, port, path, type)
    {
        return {
            host: host,
            port: port,
            path: path,
            method: type,
            headers: {
                accept: 'application/json'
                }
        };
    };


    winapi.WinObject = function(configuration){

        winapi.winHost = configuration.host || 'localhost';
        winapi.winPort = configuration.port || 3000;

    };

    winapi.WinObject.prototype.saveArtifacts = function(data,succes,failure)
    {
        //we should look at the data, and see that it's well formatted
        //saving requires specific items and configuration -- we'll need certain things
        //we will have to make the check server side regardless
        //it would help for those using win to know some documentation about what's needed

        //assuming nodejs -- we do things differently depending
        if(!isBrowser)
            this.nodeSaveArtifacts(data, success,failure);
        else
            this.jquerySaveArtifacts(data, success,failure);
    };

    winapi.WinObject.prototype.nodeSaveArtifacts = function(data, success, failure)
    {
        //makes a generic get request to artifacts, we can modify to add other information
        var request = winapi.winServerPost('/artifacts/batch');

        var req = http.request(request,function(res){
            console.log("Connected");
            res.on('data',function(data){
                console.log(data);
                success(data);
            });
        });

        req.on('error', function(e) {
            console.log('problem with find artifacts request: ' + e.message);
            if(failure)
                failure(e.message);
        });

        req.write(JSON.stringify(data));
        req.end();
    };

    winapi.WinObject.prototype.jquerySaveArtifacts = function(data, success, failure)
    {
        //makes a generic get request to artifacts, we can modify to add other information
        var request = winapi.winServerPost('/artifacts/batch');

        $.ajax({
            url: request.host + request.path,
            type: request.type,
            cache: false,
            timeout: 60000,
            complete: function() {
                //called when complete
                console.log('done with artifact post');
            },

            success: function(artifactData) {
                console.log('Artifact Post Results returned');
                success(artifactData);

            },

            error: function(err) {
                console.log('Artifact post error: ' + err.responseText);
                if(failure)
                    failure(err);
            }
        });
    };



    winapi.WinObject.prototype.findArtifacts = function(data, success, failure)
    {
        //assuming nodejs -- we do things differently depending
        if(!isBrowser)
            this.nodeFindArtifacts(data, success,failure);
        else
            this.jqueryFindArtifacts(data, success,failure);
    };

    winapi.WinObject.prototype.nodeFindArtifacts = function(data, success, failure)
    {
        //makes a generic get request to artifacts, we can modify to add other information
        var request = winapi.winServerRequest('/artifacts');

        var req = http.request(request,function(res){
            console.log("Connected");
            res.on('data',function(data){
                console.log(data);
                success(data);
            });
        });

        req.on('error', function(e) {
            console.log('problem with find artifacts request: ' + e.message);
            if(failure)
               failure(e.message);
        });

        req.write(JSON.stringify(data));
        req.end();
    };

    winapi.WinObject.prototype.jqueryFindArtifacts = function(data,success,failure)
    {
        //makes a generic get request to artifacts, we can modify to add other information
        var request = winapi.winServerRequest('/artifacts');

        $.ajax({
            url: request.host + request.path,
            type: request.type,
            cache: false,
            timeout: 60000,
            complete: function() {
                //called when complete
                console.log('done with artifact request');
            },

            success: function(artifactData) {
                console.log('Artifact Find Results returned');
                success(artifactData);

            },

            error: function(err) {
                console.log('Artifact find error: ' + err.responseText);
                if(failure)
                    failure(err);
            }
        });
    };

})(typeof exports === 'undefined'? this['neatjs']['winapi']={}: exports, this, typeof exports === 'undefined'? true : false);



