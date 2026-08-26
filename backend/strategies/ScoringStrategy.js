class ScoringStrategy {
    constructor() {
      if (this.constructor === ScoringStrategy) {
        throw new Error("ScoringStrategy soyut bir sınıftır ve doğrudan başlatılamaz.");
      }
    }
  
    calculateScore(product, user) {
      throw new Error("calculateScore metodu alt sınıfta tanımlanmalıdır.");
    }
  }
  
  module.exports = ScoringStrategy;