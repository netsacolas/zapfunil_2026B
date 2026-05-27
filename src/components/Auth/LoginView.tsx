import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Target, Lock, Mail, Loader2, User } from 'lucide-react';

export default function LoginView() {
  const login = useAppStore(state => state.login);
  const register = useAppStore(state => state.register);
  
  const [isLogin, setIsLogin] = useState(true);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      const success = await login(email, password);
      if (!success) {
        setError('E-mail ou senha inválidos.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    if (regPassword !== regConfirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }
    
    if (regPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      await register(regName, regEmail, regPassword);
      setSuccessMsg('Conta criada com sucesso! Redirecionando...');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('admin@zapfunil.com');
    setPassword('123456');
  };

  const handleFillDemoAttendant = () => {
    setEmail('ana@zapfunil.com');
    setPassword('123456');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-stone-50 border-t-4 border-orange-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-orange-600 mb-6">
           <Target size={48} strokeWidth={2.5} />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-stone-900 tracking-tight">
          ZapFunil CRM
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          {isLogin ? 'Acesso seguro à plataforma de atendimento' : 'Crie sua conta para começar'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
          
          {error && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium mb-6">
               {error}
             </div>
          )}

          {successMsg && (
             <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium mb-6">
               {successMsg}
             </div>
          )}

          {isLogin ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  E-mail
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="Seu e-mail cadastrado"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  Senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-stone-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-stone-700">
                    Lembrar de mim
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-semibold text-orange-600 hover:text-orange-500">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar na plataforma'}
                </button>
              </div>

              <div className="text-center text-sm pt-2">
                <span className="text-stone-500">Não tem uma conta? </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-orange-600 hover:text-orange-500 focus:outline-none cursor-pointer"
                >
                  Criar conta
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleRegister}>
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  Nome Completo
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="Seu nome completo"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  E-mail
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="Seu melhor e-mail"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  Senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="Mínimo 6 caracteres"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">
                  Confirmar Senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-200 rounded-xl py-3 bg-stone-50 text-stone-800"
                    placeholder="Confirme sua senha"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Criar minha conta'}
                </button>
              </div>

              <div className="text-center text-sm pt-2">
                <span className="text-stone-500">Já possui uma conta? </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-orange-600 hover:text-orange-500 focus:outline-none cursor-pointer"
                >
                  Fazer login
                </button>
              </div>
            </form>
          )}

          {isLogin && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-stone-500 text-xs font-bold uppercase tracking-wider">Acesso de Demonstração</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <button
                  onClick={handleFillDemoAdmin}
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-1 border border-stone-300 rounded-lg shadow-sm bg-white text-[10px] font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  Demo Admin
                </button>
                <button
                  onClick={handleFillDemoAttendant}
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-1 border border-stone-300 rounded-lg shadow-sm bg-white text-[10px] font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  Demo Atendente
                </button>
                <button
                  onClick={() => {
                    setEmail('mariocromia@gmail.com');
                    setPassword('33822912');
                  }}
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-1 border border-orange-300 rounded-lg shadow-sm bg-orange-50 text-[10px] font-bold text-orange-700 hover:bg-orange-100 transition cursor-pointer"
                >
                  Mário Alex (ZAP)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
