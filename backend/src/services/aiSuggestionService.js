const generateSuggestion = (queryText) => {
    if (!queryText) return 'Please provide more details regarding your concern.';
    const lowerCaseQuery = queryText.toLowerCase();

    if (lowerCaseQuery.includes('chest pain') || lowerCaseQuery.includes('heart')) {
        return 'Chest pain can have multiple causes and may require immediate attention. We strongly recommend seeking immediate medical evaluation at an emergency department or scheduling an urgent consultation.';
    }
    if (lowerCaseQuery.includes('fever') || lowerCaseQuery.includes('temperature')) {
        return 'Fever is often a sign that your body is fighting an infection. Please ensure you stay hydrated and rest. We recommend scheduling an appointment with a doctor for a proper evaluation if it persists for more than 48 hours.';
    }
    if (lowerCaseQuery.includes('headache') || lowerCaseQuery.includes('migraine')) {
        return 'Persistent headaches can be uncomfortable and have various triggers. If the headache is severe or accompanied by other symptoms like vision changes, please seek an urgent consultation.';
    }
    if (lowerCaseQuery.includes('prescription') || lowerCaseQuery.includes('refill')) {
        return 'We have received your request regarding your prescription. A doctor will review your medical history and provide the necessary instructions or authorize a refill shortly.';
    }
    if (lowerCaseQuery.includes('appointment') || lowerCaseQuery.includes('schedule')) {
        return 'Thank you for reaching out to schedule an appointment. Our reception team will contact you shortly to confirm a suitable time slot with your preferred doctor.';
    }

    const hasSymptomWords = ['pain', 'fever', 'cough', 'vomit', 'nausea', 'headache', 'dizziness']
        .some((word) => lowerCaseQuery.includes(word));

    if (hasSymptomWords) {
        return 'Based on your symptoms, start with hydration, rest, and close monitoring. If symptoms worsen, persist beyond 24-48 hours, or include warning signs, please schedule a medical appointment for evaluation.';
    }

    return `I understand your concern about "${queryText.slice(0, 80)}${queryText.length > 80 ? '...' : ''}". Please share any additional details such as duration, severity, and associated symptoms so we can provide more targeted guidance.`;
};

module.exports = { generateSuggestion };
