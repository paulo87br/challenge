/**
 * Por que o login falhou, em português.
 *
 * O callback dizia sempre a mesma coisa — "Não foi possível concluir o login" —
 * para causas que pedem ações completamente diferentes: uma conta que o projeto
 * não aceita criar, um endereço de retorno fora da lista, um código expirado.
 * Sem distinguir, quem tenta entrar fica tentando de novo, e quem conduz a aula
 * não tem como saber o que liberar.
 */
export type MotivoLogin={titulo:string;detalhe:string};

const MOTIVOS:Record<string,MotivoLogin>={
 signup_disabled:{
  titulo:'Esta conta ainda não tem acesso ao Challenge.',
  detalhe:'O projeto está fechado a contas novas, e esta é a primeira vez que esta entra. Peça a quem conduz a aula para liberar o seu acesso.'},
 access_denied:{
  titulo:'O acesso foi negado na etapa da conta.',
  detalhe:'Você pode ter cancelado a autorização, ou a conta pode não estar liberada para este Challenge.'},
 provider_email_needs_verification:{
  titulo:'O e-mail dessa conta ainda não foi verificado.',
  detalhe:'Confirme o e-mail junto ao provedor e tente de novo.'},
 validation_failed:{
  titulo:'O endereço de retorno não foi aceito.',
  detalhe:'O endereço por onde você entrou não está na lista de permitidos do projeto. Entre pelo endereço oficial do Challenge.'},
 bad_oauth_state:{
  titulo:'A volta do provedor não bateu com a ida.',
  detalhe:'Isso acontece quando a aba fica muito tempo aberta ou o login começou em outro navegador. Comece de novo nesta aba.'},
 flow_state_expired:{
  titulo:'O pedido de login expirou.',
  detalhe:'Comece de novo — o tempo entre abrir o login e voltar do provedor é curto.'},
 flow_state_not_found:{
  titulo:'Este navegador não reconhece o login que voltou.',
  detalhe:'O login precisa terminar no mesmo navegador em que começou, sem janela anônima no meio.'},
 otp_expired:{
  titulo:'O link do e-mail expirou.',
  detalhe:'Peça um novo link: cada um vale por uma hora e só pode ser usado uma vez.'},
 sem_codigo:{
  titulo:'O provedor voltou sem o código de acesso.',
  detalhe:'A autenticação começou mas não chegou a se completar.'},
 troca_falhou:{
  titulo:'A conta foi autenticada, mas a sessão não foi criada.',
  detalhe:'Comece de novo nesta mesma aba. Se repetir, avise quem cuida do Challenge.'},
};

export function motivoDoLogin(codigo?:string|null,descricao?:string|null):MotivoLogin|null{
 if(!codigo)return null;
 const conhecido=MOTIVOS[codigo];
 if(conhecido)return conhecido;
 // Um código que eu não previ ainda é melhor que "tente de novo": mostra o que
 // o provedor disse, que é o que permite a alguém agir.
 return{titulo:'Não foi possível concluir o login.',
  detalhe:String(descricao||codigo).slice(0,220)};
}
