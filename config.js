// On vérifie si Supabase est déjà initialisé pour éviter l'erreur "already declared"
if (typeof supabase === 'undefined') {
    const supabaseUrl = 'https://pmeaimfcwtykhqtueomd.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';
    
    // On crée la variable globale
    var supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
}

console.log("Configuration Supabase chargée.");
