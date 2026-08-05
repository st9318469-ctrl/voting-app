const express =require('express');
const router = express.Router();
const User = require('./../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');



router.get('/', (req, res) => {
  res.json({ message: 'User routes are working' });
});

router.post('/signup', async(req,res)=>{
  try{
    const data = req.body //Assuming the request body constians the user data 


    // create a new user documetn usni gthe mongoose model
    const newUser = new User(data);
 
     // save the new user to the database 
    const response = await newUser.save();
    console.log('data saved');

    const payload = {
      id: response.id,

    }
    console.log(JSON.stringify(payload));
    const token = generateToken(payload);
    console.log("token is:",token);

    res.status(200).json({response: response, token: token});
     }
     catch(err){
      console.log(err);

      res.status(500).json({error:'Internal server error'})
     }
}
)

router.post('/login', async(req,res) => {
  try{

    const { aadharCardNumber, password } = req.body;

    const user = await User.findOne({ aadharCardNumber: aadharCardNumber });

    // If user does not exist or pass does ot match ,return error 

    if(!user || !(await user.comparePassword(password))){

      return res.status(401).json({error: 'invalid username or password'});
    }

      // generate token

      const payload ={
        id: user.id

      }

      const token = generateToken(payload);

      res.json({token})

   } catch(err){
      console.log(err);
      res.status(500).json({error: 'internal server error'})
    
  
}}); 

router.put('/profile/password', jwtAuthMiddleware, async(req,res)=>{
  try{
    const userId = req.user.id;
    // extract the id from the url paramenter
    const { currentPassword, newPassword } = req.body
 
    //find the user by userId
    const user= await User.findById(userId);

    if (!user || !(await user.comparePassword(currentPassword))){
      return res.status(401).json({error: 'invalid username or pasword'})
      ;


    }

    user.password = newPassword;
    await user.save();

    console.log('password updated');
    res.status(200).json({message: "password updated"});


  }catch(err){
    console.log(err);
    res.status(500).json({error:'internal server error'})
  }
})

module.exports = router;
