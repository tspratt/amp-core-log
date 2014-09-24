//- Acts as an abstract factory to load the config file based on the "--config" argument passed on
//- The Query string
'use strict';
var createConfig = function(){
    var configName = "default"; //- loads the default config file if no argument is found
    for(var i=0; i<process.argv.length; i++){
        var parts = process.argv[i].split(':');
        if(parts.length > 1 && parts[0] === "--" + "config"){
            configName = parts[1];
            break;
        }
    }
    return require('./' + configName); //- Will throw error if config file specified not found
};

exports.SvcConfig = createConfig().SvcConfig;