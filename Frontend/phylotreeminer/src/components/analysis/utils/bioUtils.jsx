export const sortSequencesBySimilarity = (seqs) => {
  if (seqs.length <= 1) return seqs;
  
  const reference = seqs[0].sequence;
  
  return [...seqs].sort((a, b) => {
    const scoreA = calculateIdentity(a.sequence, reference);
    const scoreB = calculateIdentity(b.sequence, reference);
    return scoreB - scoreA; // Ordem decrescente de similaridade
  });
};

const calculateIdentity = (s1, s2) => {
  let matches = 0;
  const len = Math.min(s1.length, s2.length);
  for (let i = 0; i < len; i++) {
    if (s1[i] === s2[i]) matches++;
  }
  return matches / len;
};