import { z } from "zod";
import {
  Parentesco,
  EtapaVida,
  TipoVivienda,
  EstatusPropiedad,
  EstatusActual,
  NacionalidadCedula,
} from "shared";

const parentescoEnum = z.enum([
  Parentesco.CONYUGE,
  Parentesco.HIJO,
  Parentesco.SOBRINO,
  Parentesco.FAMILIAR,
]);

export const refugiadoBaseSchema = z.object({
  refugioId: z.string().uuid(),
  aulaId: z.string().uuid().nullable().optional(),
  origen: z.string().min(1).max(200),
  jefeFamilia: z.boolean(),
  jefeFamiliaId: z.string().uuid().nullable().optional(),
  parentesco: parentescoEnum.nullable().optional(),
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  nacionalidadCedula: z.enum([NacionalidadCedula.V, NacionalidadCedula.E]).nullable().optional(),
  cedula: z.string().max(20).nullable().optional(),
  telefono: z.string().max(50).nullable().optional(),
  edad: z.number().int().min(0).max(150),
  etapaVida: z.enum([
    EtapaVida.PRIMERA_INFANCIA,
    EtapaVida.INFANCIA,
    EtapaVida.ADOLESCENCIA,
    EtapaVida.JUVENTUD,
    EtapaVida.ADULTEZ,
    EtapaVida.VEJEZ,
  ]),
  patologia: z.boolean(),
  patologiaDescripcion: z.string().max(1000).nullable().optional(),
  foto: z
    .string()
    .max(2_000_000)
    .nullable()
    .optional()
    .refine(
      (v) => !v || v.startsWith("data:image/") || v.startsWith("http"),
      "La foto debe ser un data URL o una URL válida.",
    ),
  estado: z.string().min(1).max(100),
  municipio: z.string().min(1).max(100),
  parroquia: z.string().min(1).max(100),
  sector: z.string().min(1).max(200),
  direccion: z.string().min(1).max(500),
  tipoVivienda: z.enum([
    TipoVivienda.CASA,
    TipoVivienda.APARTAMENTO,
    TipoVivienda.RANCHO,
    TipoVivienda.OTROS,
  ]),
  estatusPropiedad: z.enum([
    EstatusPropiedad.PROPIA,
    EstatusPropiedad.ALQUILADA,
    EstatusPropiedad.PRESTADA,
    EstatusPropiedad.OTROS,
  ]),
  estatusActual: z.enum([
    EstatusActual.AGRIETADA,
    EstatusActual.ALTO_RIESGO,
    EstatusActual.RIESGO_LEVE,
    EstatusActual.SIN_RIESGO,
  ]),
});

export const crearRefugiadoSchema = refugiadoBaseSchema
  .refine(
    (d) => {
      // Es jefe de familia => no debe traer jefeFamiliaId ni parentesco
      if (d.jefeFamilia) return !d.jefeFamiliaId && !d.parentesco;
      // No es jefe: o es independiente (ambos nulos) o familiar (ambos presentes)
      const ambosNulos = !d.jefeFamiliaId && !d.parentesco;
      const ambosPresentes = !!d.jefeFamiliaId && !!d.parentesco;
      return ambosNulos || ambosPresentes;
    },
    {
      message:
        "Si es jefe de familia no debe llevar jefeFamiliaId ni parentesco. Si no es jefe, debe indicarlos juntos (familiar) o no indicar ninguno (independiente).",
    },
  )
  .refine(
    (d) => !d.patologia || (d.patologiaDescripcion && d.patologiaDescripcion.trim().length > 0),
    { message: "Si posee patología, debe especificar la descripción." },
  );

export const actualizarRefugiadoSchema = refugiadoBaseSchema.partial();
