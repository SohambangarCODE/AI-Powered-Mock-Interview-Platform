const user = require("../models/userModel");

const signToken = (userID) => {
  jwt.sign({userID }, process.env.JWT_SECRET, { expiresIn: "1d" });
  }

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new user({ name, email, password });
    const token = signToken( newUser._id);
    await newUser.save();

    res
      .status(201)
      .json({
        message: "User registered successfully",
        user: { id: newUser._id, name: newUser.name, email: newUser.email },
        token,
      });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if(!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await existingUser.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "User logged in successfully", user: { id: existingUser._id, name: existingUser.name, email: existingUser.email }, token: signToken(existingUser._id).toString() });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const existingUser = await user.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: { id: existingUser._id, name: existingUser.name, email: existingUser.email } });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
