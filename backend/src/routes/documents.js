const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const supabase = require('../services/supabaseClient');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please attach a PDF.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const fileSize = req.file.size;
  const filename = req.file.filename;

  try {
    const { data: docRecord, error: insertError } = await supabase
      .from('documents')
      .insert([
        {
          filename: filename,
          original_name: originalName,
          file_size: fileSize,
          status: 'processing'
        }
      ])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    const documentId = docRecord.id;

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: originalName,
      contentType: 'application/pdf'
    });

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 120000 
    });

    const analysisResult = aiResponse.data;

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'completed',
        analysis_result: analysisResult,
        extracted_text: analysisResult.raw_text || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document with analysis:', updateError.message);
    }

    fs.unlink(filePath, (err) => {
      if (err) console.error('Warning: Could not delete temp file:', err.message);
    });

    return res.status(200).json({
      success: true,
      documentId: documentId,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Upload/analysis error:', error.message);

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }

    const errMessage = error.message || 'Unknown error';

    return res.status(500).json({
      error: 'Failed to process document.',
      details: errMessage
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, filename, original_name, file_size, upload_date, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, documents: data });

  } catch (error) {
    console.error('Fetch documents error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch documents.', details: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Document not found.' });
      }
      throw new Error(error.message);
    }

    return res.status(200).json({ success: true, document: data });

  } catch (error) {
    console.error('Fetch document error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch document.', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });

  } catch (error) {
    console.error('Delete document error:', error.message);
    return res.status(500).json({ error: 'Failed to delete document.', details: error.message });
  }
});

module.exports = router;