var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StockSchema = new Schema(
  {
    name : {type : String, required : true, index:{unique:true}},
    PE_RATIO : {type : String},
    PEG_RATIO : {type : String},
    PB_RATIO : {type : String},
    EV_EBITDA_RATIO : {type : String} 
  }
);

//Export model
module.exports = mongoose.model('Stock', StockSchema);
