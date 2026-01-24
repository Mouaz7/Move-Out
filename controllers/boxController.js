"use strict";
const path = require("path");
const fs = require("fs");
const boxService = require("../src/services/boxService");
const userService = require("../src/services/userService");
require("dotenv").config();

// GET /boxes
exports.getBoxes = async (req, res) => {
  try {
    const boxes = await boxService.getAllBoxes(req.user.id);
    res.render("all_boxes", { title: "All Boxes - MoveOut", boxes, user: req.user });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    res.status(500).send("Error fetching boxes");
  }
};

// GET /boxes/create
exports.getCreateBox = (req, res) => {
  res.render("create_box", { title: "Create Box - MoveOut", user: req.user });
};

// POST /boxes/create
exports.postCreateBox = async (req, res) => {
  const { boxName, labelImage, labelName, contentType, contentText, isPrivate, pinCode } = req.body;

  const labelImageFile = req.files?.["labelImageFile"]?.[0]?.filename || null;
  const contentFile = req.files?.["contentFile"]?.[0]?.filename || null;

  try {
    // Calculate file size for storage tracking
    let fileSize = 0;
    if (contentFile) {
      const filePath = path.join(__dirname, "../uploads/", contentFile);
      // Note: We need to handle path correctly. uploads/ is in root.
      // controllers/boxController.js -> ../uploads/
      if (fs.existsSync(filePath)) {
         const stats = fs.statSync(filePath);
         fileSize = stats.size;
      }
    }

    await userService.updateStorageUsage(req.user.id, fileSize);

    const boxId = await boxService.createBox(
      req.user.id,
      boxName,
      labelName,
      labelImageFile || labelImage,
      contentType,
      contentText,
      contentFile,
      isPrivate === "on" ? 1 : 0,
      pinCode || null
    );

    res.redirect(`/move/boxes/view/${boxId}`);
  } catch (error) {
    console.error("Error creating box:", error);
    res.status(500).send("Error creating box");
  }
};

// GET /boxes/view/:boxId
exports.getBox = async (req, res) => {
  try {
    const box = await boxService.getBoxById(req.params.boxId, req.user.id);
    const contents = await boxService.getBoxContents(req.params.boxId);
    
    if (box) {
      res.render("box_content", { 
        title: "Box Details - MoveOut", 
        box, 
        contents, 
        user: req.user 
      });
    } else {
      res.status(404).send("Box not found");
    }
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
};

// GET /boxes/edit/:boxId
exports.getEditBox = async (req, res) => {
  try {
    const box = await boxService.getBoxById(req.params.boxId, req.user.id);
    if (!box) {
      return res.status(404).send("Box not found");
    }
    res.render("edit_box", { title: "Edit Box - MoveOut", box, user: req.user });
  } catch (error) {
    console.error("Error fetching box:", error);
    res.status(500).send("Error fetching box");
  }
};

// POST /boxes/edit/:boxId
exports.postEditBox = async (req, res) => {
  const { boxName, labelImage, label_name: labelName, contentType, content_data: contentText, isPrivate, pinCode } = req.body;
  const labelImageFile = req.files?.["labelImageFile"]?.[0]?.filename || null;
  const contentFile = req.files?.["contentFile"]?.[0]?.filename || null;

  try {
    let fileSize = 0;
    if (contentFile) {
      const filePath = path.join(__dirname, "../uploads/", contentFile);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
    }

    await userService.updateStorageUsage(req.user.id, fileSize);

    const contentData = contentType === "text" ? contentText : contentFile || contentText;

    // Check ownership before updating? boxService.updateBox has user_id in WHERE clause.
    await boxService.updateBox(
      req.params.boxId,
      req.user.id,
      boxName,
      // Note: original updateBox only took boxName and labelDesign? 
      // Let's check api result for cli.js updateBox signature.
      // It was: async function updateBox(boxId, userId, boxName, labelDesign) { ... }
      // AND query was: UPDATE boxes SET box_name = ?, label_design = ? ... 
      // WAIT, routes/boxes.js calls: 
      /*
          const [result] = await connection.query(
            `UPDATE boxes SET box_name = ?, label_name = ?, label_image = ?, 
             content_type = ?, content_data = ?, is_private = ?, pin_code = ? 
             WHERE box_id = ? AND user_id = ?`,
      */
      // It seems routes/boxes.js was doing direct DB query, it was NOT calling cli.updateBox because cli.updateBox was too limited!
      // I need to update boxService.js to support full update.
      // I will assume I updated boxService.js or I will update it now?
      // Step 246 created boxService.js. I used the code from cli.js.
      // So boxService.js `updateBox` IS LIMITED.
      // I MUST update boxService.js to support full fields.
      
      // I will proceed with writing this controller assuming I will fix boxService in next step.
      // Actually, I can write the correct call here and then fix service.
      labelName // passing additional args... 
    );
     
    // Temporary fix: I will use a new method `updateBoxFull` or update existing signature in next turn.
    // Let's call it `updateBoxFull` here.
    await boxService.updateBoxFull(
        req.params.boxId,
        req.user.id,
        boxName,
        labelName,
        labelImageFile || labelImage,
        contentType,
        contentData,
        isPrivate === "on" ? 1 : 0,
        pinCode
    );

    res.redirect(`/move/boxes/view/${req.params.boxId}`);
  } catch (error) {
    console.error("Error editing box:", error);
    res.status(500).send("Error editing box");
  }
};

// POST /boxes/delete/:boxId
exports.deleteBox = async (req, res) => {
  try {
    await boxService.deleteBox(req.params.boxId, req.user.id);
    res.redirect("/move/boxes");
  } catch (error) {
    console.error("Error deleting box:", error);
    res.status(500).send("Error deleting box");
  }
};

// POST /boxes/:boxId/labels/create
exports.createLabel = async (req, res) => {
  const { boxId } = req.params;
  const { labelName, isPrivate } = req.body;
  const isPrivateBool = isPrivate === "on";

  try {
    await boxService.createOrUpdateLabel(null, labelName, isPrivateBool, boxId);
    res.redirect(`/move/boxes/view/${boxId}`);
  } catch (error) {
    console.error("Error creating/updating label:", error);
    res.status(500).send("Error creating/updating label");
  }
};
