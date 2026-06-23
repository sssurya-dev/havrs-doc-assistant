const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabaseClient');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

router.post('/', async (req, res) => {
  const { documentId, message, sessionId } = req.body;

  if (!documentId || !message) {
    return res.status(400).json({ error: 'documentId and message are required.' });
  }

  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('extracted_text, original_name, analysis_result')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!document.extracted_text) {
      return res.status(400).json({ error: 'Document has no extracted text. Please re-upload.' });
    }

    let chatHistory = [];
    let currentSessionId = sessionId || null;

    if (currentSessionId) {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', currentSessionId)
        .single();

      if (session && session.messages) {
        chatHistory = session.messages;
      }
    }

    const aiResponse = await axios.post(`${AI_SERVICE_URL}/chat`, {
  message: message,
  context: document.extracted_text
}, { timeout: 60000 });

const aiReply = aiResponse.data.answer;

    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiReply, timestamp: new Date().toISOString() }
    ];

    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{
          document_id: documentId,
          messages: updatedHistory
        }])
        .select()
        .single();

      if (!sessionError && newSession) {
        currentSessionId = newSession.id;
      }
    } else {
      await supabase
        .from('chat_sessions')
        .update({ messages: updatedHistory, updated_at: new Date().toISOString() })
        .eq('id', currentSessionId);
    }

    return res.status(200).json({
      success: true,
      reply: aiReply,
      sessionId: currentSessionId
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    return res.status(500).json({ error: 'Chat request failed.', details: error.message });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    return res.status(200).json({ success: true, session: data });

  } catch (error) {
    console.error('Fetch history error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch history.', details: error.message });
  }
});

module.exports = router;