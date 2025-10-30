import pdfParse from 'pdf-parse-fork';
import mammoth from 'mammoth';

export const parsePDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
};

export const parseDOCX = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      messages: result.messages
    };
  } catch (error) {
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
};

export const parseText = (text) => {
  return {
    text: text.trim(),
    wordCount: text.split(/\s+/).length
  };
};