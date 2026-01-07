// ==========================================
// CONFIGURATION SUPABASE (Côté Client / Web)
// ==========================================

const _supabaseUrl = 'https://pmeaimfcwtykhqtueomd.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';

// On utilise un bloc try/catch pour éviter que tout le site plante si Supabase est injoignable
var maConnexion;

try {
    if (typeof supabase !== 'undefined') {
        maConnexion = supabase.createClient(_supabaseUrl, _supabaseKey);
        console.log("✅ Client Supabase initialisé avec succès dans 'maConnexion'");
    } else {
        console.error("❌ Erreur : La bibliothèque Supabase n'est pas chargée. Vérifiez l'ordre des scripts dans votre HTML.");
    }
} catch (error) {
    console.error("❌ Erreur lors de l'initialisation de Supabase :", error);
}

