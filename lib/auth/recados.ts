/**
 * O que o GoTrue diz, no idioma de quem está diante da tela.
 *
 * Numa turma de trinta pessoas, duas travaram na porta lendo "email rate limit
 * exceeded" e "For security purposes, you can only request this after 19
 * seconds" -- em inglês, sem dizer o que fazer. A saída existia a dois
 * centímetros dali, no botão do Google, e ninguém foi mandado para lá.
 *
 * Cada recado diz o que aconteceu e qual é o próximo passo. Mensagem que não
 * reconheço volta como veio: inventar uma tradução esconderia o original de
 * quem pode precisar dele.
 */
export type Recado={texto:string;sugereSSO:boolean};

export function recadoDeEntrada(bruto:string):Recado{
 const m=String(bruto||'').trim();
 if(!m)return{texto:'',sugereSSO:false};

 const segundos=/only request this after (\d+) second/i.exec(m);
 if(segundos)return{sugereSSO:true,
  texto:`Já foi pedido um link há pouco para este e-mail. Espere ${segundos[1]} segundos — ou entre com Google ou Microsoft, que é imediato.`};

 if(/email rate limit exceeded/i.test(m))return{sugereSSO:true,
  texto:'O envio de links por e-mail atingiu o limite do serviço. Entre com Google ou Microsoft: não depende de e-mail e funciona agora.'};

 if(/over_email_send_rate_limit|rate limit/i.test(m))return{sugereSSO:true,
  texto:'O serviço de e-mail está limitando os envios. Entre com Google ou Microsoft.'};

 if(/signups? not allowed|disable_?signup/i.test(m))return{sugereSSO:false,
  texto:'A criação de contas está desligada neste Challenge. Fale com quem conduz a aula.'};

 if(/invalid login credentials|invalid email/i.test(m))return{sugereSSO:false,
  texto:'Esse e-mail não parece válido. Confira e tente de novo.'};

 if(/redirect|url/i.test(m)&&/not allowed|invalid/i.test(m))return{sugereSSO:true,
  texto:'O endereço de retorno não está liberado no servidor de contas. Entre com Google ou Microsoft e avise quem conduz a aula.'};

 return{texto:m,sugereSSO:false};
}
