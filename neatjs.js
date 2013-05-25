//Use this as a way to load in the entire library
(function(exports, selfBrowser, isBrowser){

    var libraryName = 'neatjs';
    var common;

    if(isBrowser)
    {
        common = this['common'];
        if(!common){
            this['common'] = {};
            common = this['common'];
        }
    }
    else
        common = exports;


    var libraryScripts =
    {
        //load in neat things
        //help first
        'neatParameters' :  "/neatHelp/neatParameters.js",
        'neatHelp' :  "/neatHelp/neatHelp.js",
        'neatDecoder' :  "/neatHelp/neatDecoder.js",

        'neatNode'  :  '/genome/neatNode.js',
        'neatConnection'  :  '/genome/neatConnection.js',
        'neatGenome'  :  '/genome/neatGenome.js',

        'genomeSharpToJS' :  "/utility/genomeSharpToJS.js"
    };

    //we export our scripts!
    if(!common.scripts)
        common.scripts = {};



    if(!isBrowser)
    {
        //use nodejs to find all js files, and update them
        var fs = require('fs'),
            path = require('path');

        libraryScripts = {};



        var homeDirectory  = __dirname;
        var directoryCount = 0;

        var ignoreList =
            [
                'test',
                'node_modules',
                '.git',
                '.idea',
                'cppnjs'
            ];

        var shouldIgnore = function(fileName)
        {
            for(var i=0; i < ignoreList.length; i++)
            {
                if(fileName.indexOf(ignoreList[i]) !== -1)
                    return true;
            }
            return false;
        };

        var isJavascript = function(fileName)
        {
            return fileName.substr(fileName.length - 3, 3) === '.js';
        };

        var recursiveReadDirectorySync = function(directoryPath, builtDirectory, finished)
        {
            directoryCount++;
            var files = fs.readdirSync(directoryPath);

            files.forEach(function(f)
            {
                if(fs.lstatSync(path.resolve(directoryPath, f)).isDirectory())
                {
                    //we're a directory, but not node modules or test directory, please investigate!
                    //we should make sure we're not in our .gitignore list!
                    if(!shouldIgnore(f))
                    {
                        recursiveReadDirectorySync(path.resolve(directoryPath, f), builtDirectory + f + '/', finished);
                    }
                }
                else
                {
                    //are we a js file?
                    if(isJavascript(f))
                    {
                        var nojs = f.replace('.js','');
                        libraryScripts[nojs] = builtDirectory + f
                    }
                }

            });

            directoryCount--;
        };
        //we load up our libraries synchronously when we first start
        recursiveReadDirectorySync(homeDirectory, '/');
    }
    else
    {
        if(!common.libraries)
            common.libraries = {};

        common.libraries[libraryName] = libraryScripts;
    }

    common.scripts[libraryName] = libraryScripts;

    common.loadLibraryFile = function(library, script)
    {
        //we're in nodejs
        if(!isBrowser)
        {
            //if we haven't loaded this library, require it using our script objects
            if(!common[library])
                common[library] = {};

            if(!common[library][script])
                common[library][script] = require('.' + common.scripts[library][script]);

            //otherwise return cached objects
            return common[library][script];
        }
        else
        {
            //we assume you've called async load libraries, in which case if you didn't we fail silently
            //better quicker than slower, only need 1 call to load library
            if(!selfBrowser[library])
                return undefined;

            //easy, return the library and script from this object
            //might be undefined, but that will be handled later anyways
            return selfBrowser[library][script];
        }
    };

    if(!common.asyncLoadLibraries)
    {
        common.asyncLoadLibraries = function(relativeLocations, callback)
        {
            //we use jquery for loading our scripts
            if(isBrowser)
            {
                if(common.isLoaded)
                    return;

                var libraries = common.libraries;

                //how many scripts to load?
                var scriptCount = 0;
                for(var library in libraries){
                    for(var key in libraries[library])
                    {
                        scriptCount++;
                    }
                }

                for(var library in libraries){

                    var relLocation = relativeLocations[library];
                    if(!relLocation)
                    {
                        console.log('Have library, but not loading it: ' + library);
                        continue;
                    }


                    for(var script in libraries[library])
                    {

                        $.getScript(relLocation + libraries[library][script])
                            .done(function(scriptString) {
                                scriptCount--;
                                if(scriptCount ==0)
                                {
                                    //for each of our loaded modules, we must check dependencies
                                    for(var lib in libraries){
                                        for(var sc in libraries[lib]){
                                            if( selfBrowser[lib][sc] &&
                                                selfBrowser[lib][sc].CheckDependencies !== undefined)
                                                selfBrowser[lib][sc].CheckDependencies();
                                        }
                                    }

                                    common.isLoaded = true;

                                    //huzzah! We got em all, away we go!
                                    callback();
                                }
                            })
                            .fail(function(jqxhr, settings, exception) {
                                //ajax hanlder error
                                callback("Ajax handler error: " + exception);
                            });
                    }
                }
            }
        };
    }

    //send in the object, and also whetehr or not this is nodejs
})(typeof exports === 'undefined'? this['neatjs']={}: exports, this, typeof exports === 'undefined'? true : false);


