//File responsible for contacting the WIN API at the global level,
//or saving locally -- this will add some filter on top of the win calls
//this is of course optional, but might help for organizing other language
//implementations of WIN (I want to make C# version soon)

(function(exports, selfBrowser, isBrowser){

    var winlocal = exports;









})(typeof exports === 'undefined'? this['neatjs']['winlocal']={}: exports, this, typeof exports === 'undefined'? true : false);
