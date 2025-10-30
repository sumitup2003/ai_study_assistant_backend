// Simple in-memory vector search using cosine similarity
// For production, consider using MongoDB Atlas Vector Search (paid) or Pinecone (has free tier)

class VectorSearch {
  // Simple embedding using word frequency (TF-IDF like approach)
  createSimpleEmbedding(text, dimension = 100) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const embedding = new Array(dimension).fill(0);
    
    words.forEach((word, idx) => {
      const hash = this.simpleHash(word, dimension);
      embedding[hash] += 1;
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  simpleHash(str, max) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % max;
  }

  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  }

  findRelevantChunks(query, chunks, topK = 3) {
    const queryEmbedding = this.createSimpleEmbedding(query);
    
    const scored = chunks.map(chunk => ({
      ...chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding || this.createSimpleEmbedding(chunk.text))
    }));
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

module.exports = new VectorSearch();