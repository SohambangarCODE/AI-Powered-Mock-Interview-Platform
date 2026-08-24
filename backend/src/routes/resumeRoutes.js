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
        // Accept common resume file types
        const allowedTypes=[
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-office",
            "octet-stream" // fallback for some browsers
        ];
        if(allowedTypes.includes(file.mimetype)){
            cb(null,true);
        }else{
            // Also accept if file name suggests valid type
            const allowedExtensions=[".pdf", ".txt", ".doc", ".docx"];
            const ext = file.originalname?.substring(file.originalname?.lastIndexOf('.') || '') || '';
            if(allowedExtensions.includes(ext.toLowerCase())){
                cb(null,true);
            }else{
                cb(new Error("Invalid file type"),false);
            }
        }
    }
});

router.post("/analyze", authMiddleware, upload.single("resume"), analyzeResume);

module.exports = router;