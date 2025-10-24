// Configuração do Supabase
const SUPABASE_URL = 'https://lrywyxbqqxibygisximi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyeXd5eGJxcXhpYnlnaXN4aW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NzM3MDEsImV4cCI6MjA1ODI0OTcwMX0.9TOe8J1tt2k3ik1jsbKjaEFI5ZpGPyjvIwCA2vwVQ3I';

// Inicializar cliente Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso global
window.supabaseClient = supabaseClient;