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

var UserSchema = new Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    portfolio : [{
        type: StockSchema
    }]
  }
);

//Export model
module.exports = mongoose.model('User', UserSchema);

