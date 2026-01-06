// On définit les clés
const _supabaseUrl = 'https://pmeaimfcwtykhqtueomd.supabase.co';
const _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZWFpbWZjd3R5a2hxdHVlb21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzA4MzIsImV4cCI6MjA4MzMwNjgzMn0.X91Usnq8WtZYuY40UFIo7Xl8P1O46LKqe1GvJ7RIWYE';

// On crée le client dans une variable globale nommée "maConnexion"
// Cela évite de se mélanger avec le mot "supabase" qui est réservé à la bibliothèque
var maConnexion = supabase.createClient(_supabaseUrl, _supabaseKey);

console.log("Client Supabase initialisé dans 'maConnexion'");
