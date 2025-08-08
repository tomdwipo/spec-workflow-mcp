export function formatUserStory(userStory) {
  if (!userStory) return '';
  return userStory.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export function formatAcceptanceCriteria(criteria) {
  if (!criteria) return '';
  return criteria.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export function scrollToRequirement(arg1, arg2) {
  // Support both signatures:
  // - scrollToRequirement(reqId)
  // - scrollToRequirement(specName, reqId)
  let targetId;
  if (typeof arg2 === 'undefined') {
    targetId = `requirement-${arg1}`;
  } else {
    targetId = `${arg1}-req-${arg2}`;
  }
  let element = document.getElementById(targetId);
  if (!element && typeof arg2 !== 'undefined') {
    // Fallback to legacy id format
    element = document.getElementById(`requirement-${arg2}`);
  }
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/50');
    setTimeout(() => {
      element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/50');
    }, 2000);
  }
}


