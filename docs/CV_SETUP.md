# CV Download Setup Guide

## Overview

This guide explains how to configure CV download functionality using Supabase Storage for your MoveOut application or personal portfolio.

## How It Works

Your application downloads the CV directly from **Supabase Storage**. This means you can update your CV without redeploying your website!

## Setup Steps

### 1. Create Supabase Storage Bucket

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Storage** → **New bucket**
3. Create a bucket named `cv-files`
4. Set bucket to **Public** (for public access) or **Private** (for signed URLs)

### 2. Upload Your CV

1. Inside the `cv-files` bucket, create a folder named `cv`
2. Upload your CV file as `CV.pdf`
3. Full path will be: `cv-files/cv/CV.pdf`

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Create API Route (Optional)

If you want a custom download endpoint, create `routes/cv.js`:

```javascript
const express = require("express");
const router = express.Router();
const { getSupabaseClient } = require("../config/db/supabase");

const CV_BUCKET = "cv-files";
const CV_FILENAME = "cv/CV.pdf";

router.get("/download", async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return res.status(503).json({ error: "Storage not available" });
    }

    // Create signed URL (valid for 60 seconds)
    const { data, error } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUrl(CV_FILENAME, 60);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.redirect(data.signedUrl);
  } catch (error) {
    console.error("CV download error:", error);
    res.status(500).json({ error: "Failed to download CV" });
  }
});

module.exports = router;
```

## Update Your CV (Anytime)

When you update your CV:

1. Download the new PDF (e.g., from Overleaf or Google Docs)
2. Go to Supabase Storage → `cv-files` bucket → `cv` folder
3. **Delete** the old `CV.pdf` file
4. **Upload** the new file with the same name: `CV.pdf`
5. Your website will automatically serve the new version!

## Bucket Settings

### For Public Access

```sql
-- Make bucket public (run in SQL Editor)
UPDATE storage.buckets
SET public = true
WHERE name = 'cv-files';
```

### For Private Access (Recommended)

Keep the bucket private and use signed URLs (as shown in the code above).

## Troubleshooting

### CV doesn't download

- Check browser console for errors
- Verify the file exists at `cv-files/cv/CV.pdf` in Supabase
- Check SUPABASE_URL and SUPABASE_ANON_KEY are correct

### File not found (404)

- Make sure the file is named exactly `CV.pdf` (case-sensitive)
- Verify it's inside the `cv` folder within the `cv-files` bucket

### Permission denied

- Check bucket policies in Supabase
- Verify RLS (Row Level Security) policies allow access

## Benefits

| Benefit            | Description                        |
| ------------------ | ---------------------------------- |
| ✅ No code changes | Update CV without touching code    |
| ✅ No redeployment | Changes are instant                |
| ✅ Always fresh    | No caching issues                  |
| ✅ Version control | Keep old versions in Supabase      |
| ✅ Secure          | Use signed URLs for private access |

## Recommended Workflow

1. Update CV in your favorite editor (Overleaf, Google Docs, Word)
2. Export/Download as PDF
3. Upload to Supabase `cv-files/cv/` (replace old file)
4. Done! ✨

Your portfolio immediately serves the new CV to all visitors.

---

**Note:** This setup is designed for portfolio websites. For MoveOut (box management), you might want to use a similar approach for user-uploaded documents.
