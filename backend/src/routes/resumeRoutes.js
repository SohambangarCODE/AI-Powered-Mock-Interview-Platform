const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  analyzeResume,
} = require("../controllers/resumeController.js");
const multer = require("multer");
 

const upload=multer({
    storage:multer.memoryStorage(),
    limits:{fileSize:5*1024*1024}, // 5MB limit
    fileFilter:(req,file,cb)=>{
        const allowedTypes=["application/pdf","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        if(allowedTypes.includes(file.mimetype)){
            cb(null,true);
        }else{
            cb(new Error("Invalid file type"),false);
        }
    }
});

router.post("/analyze", authMiddleware, upload.single("resume"), analyzeResume);

module.exports = router;