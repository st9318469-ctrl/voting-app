const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name:{

    type:String,
    required:true
  },
  age:{
    type:Number
  },
  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true
  },
  mobile:{
    type:String,
    required:true
  },
  address:{
    type:String,
    required: true
  },
  aadharCardNumber:{
     type:Number,
     required:true,
     unique:true
  },
  password:{
     type:String,
     required:true
  },
  role:{
    type:String,
    enum: ['voter','admin'],
    default:'voter'
  },
  isVoted:{
    type:Boolean,
    default: false

  }
  
});

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

userSchema.pre('save', async function(){
  const person = this;

  // Hash the password only if it has been modified (or is new)
  if(!person.isModified('password')) return;

  //hash password
  const hashedPassword = await bcrypt.hash(person.password, 10);

  person.password = hashedPassword;
})

userSchema.methods.comparePassword = async function(candidatePassword){
  try{

const isMatch = await bcrypt.compare(candidatePassword,this.password);

    return isMatch;

  }catch(err){
    throw err;
    
  }
}

const User = mongoose.model('user',userSchema);
module.exports = User;
