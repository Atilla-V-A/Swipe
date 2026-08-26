const ScoringStrategy = require('./ScoringStrategy');

class TagScoringStrategy extends ScoringStrategy {
  calculateScore(product, user) {
    let score = 0;
    
    if (!user.tagScores) {
      return score;
    }

    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach(tag => {
        if (user.tagScores.has(tag)) {
          score += user.tagScores.get(tag);
        }
      });
    }

    return score;
  }
}

module.exports = TagScoringStrategy;