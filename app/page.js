if (!user) return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center px-6 text-center ${currentTheme.bg}`}>
       <div className="w-full max-w-sm flex flex-col items-center">
         <h1 className={`text-4xl sm:text-5xl font-black italic bg-clip-text text-transparent bg-gradient-to-r ${currentTheme.accent} leading-tight`}>
           ROUTINE<br className="sm:hidden" /> MASTER
         </h1>
         <button 
           onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} 
           className="mt-10 w-full sm:w-auto bg-white text-black px-12 py-5 rounded-full font-black shadow-2xl transition-all active:scale-95 text-sm tracking-widest"
         >
           GOOGLE LOGIN
         </button>
       </div>
    </div>
  );
