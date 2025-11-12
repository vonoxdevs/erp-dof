-- Recriar o trigger para criar user_profile automaticamente
-- Este trigger cria um perfil de usuário sempre que uma nova conta é criada

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();