import{createSupabaseServerClient}from'@/lib/supabase/server';
import{mundosNoAr}from'@/lib/supabase/sessions';
import{codigoValido,normalizaCodigo}from'@/lib/mundo/codigo';
import{EscolherMundo}from'@/app/ui/escolher-mundo';
import{Entrar}from'./entrar';

export const dynamic='force-dynamic';
export const metadata={title:'Entrar · Challenge'};

/**
 * O endereço que vai no QR e no link. Só lê aqui: entrar cria uma sessão, e
 * criar sessão num GET faria o prefetch do navegador abrir corridas que ninguém
 * pediu. Quem entra é o POST que o componente de cliente dispara.
 */
export default async function EntrarPorLink({params}:{params:{code:string}}){
 const codigo=normalizaCodigo(params.code);
 const supabase=createSupabaseServerClient();
 if(!supabase)return <EscolherMundo mundos={[]} titulo="Challenge ainda não está configurado"
  descricao="Falta a conexão com o Supabase."/>;

 const{mundos,faltaMigracao}=await mundosNoAr(supabase);
 const mundo=codigoValido(codigo)?mundos.find(m=>m.join_code===codigo):undefined;
 if(!mundo)return <EscolherMundo mundos={mundos} faltaMigracao={faltaMigracao}
  titulo={codigoValido(codigo)?`O código ${codigo} não abre nenhum mundo`:'Código incompleto'}
  descricao={codigoValido(codigo)
   ?'Pode ser que o mundo tenha saído do ar, ou que um caractere tenha se perdido no caminho. Confira com quem conduz a aula.'
   :`Um código tem quatro caracteres.`}/>;

 return <Entrar mundo={mundo}/>;
}
