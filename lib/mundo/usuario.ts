/**
 * O nome que aparece na tela. O SSO da Google e da Microsoft devolve o nome
 * completo em metadados com chaves diferentes, e login por e-mail não devolve
 * nome nenhum — nesse caso a parte antes do @ é o que a pessoa reconhece como
 * seu, melhor que um endereço inteiro espremido na barra lateral.
 */
export function nomeDoUsuario(user:any):string{
 const meta=user?.user_metadata||{};
 const nome=String(meta.full_name||meta.name||meta.preferred_username||'').trim();
 if(nome)return nome;
 const email=String(user?.email||'').trim();
 if(!email)return 'Você';
 return email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,l=>l.toLocaleUpperCase());
}

export function iniciais(nome:string):string{
 return nome.split(/\s+/).filter(Boolean).map(p=>p[0]).slice(0,2).join('').toLocaleUpperCase()||'?';
}
