"use client";

import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useState,
  useEffect,
  useCallback,
} from "react";

/**
 * Da formato con separadores de miles (puntos) a una cifra numérica entera.
 * Ejemplo: 1500000 -> "1.500.000"
 */
export function formatearMiles(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const str = String(valor).replace(/\D/g, "");
  if (!str) return "";
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Extrae el valor numérico puro entero eliminando puntos, símbolos o letras.
 * Ejemplo: "1.500.000" -> 1500000
 */
export function desformatearMiles(texto: string | null | undefined): number {
  if (!texto) return 0;
  const limpio = String(texto).replace(/\D/g, "");
  return limpio ? parseInt(limpio, 10) : 0;
}

export interface InputDineroProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** Valor numérico o en texto sin formato almacenado en el estado del padre */
  value: number | string;
  /** Callback estándar de React. e.target.value entrega el número limpio sin puntos (ej. "150000") */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback opcional directo con el valor numérico entero y formateado */
  onValueChange?: (valorNumerico: number, valorFormateado: string) => void;
  /** Si debe mostrar el signo $ fijo a la izquierda */
  mostrarPrefijo?: boolean;
  /** Clases CSS para el prefijo $ */
  clasePrefijo?: string;
  /** Si debe permitir valor 0 explícito cuando esté vacío (por defecto false para mostrar placeholder) */
  permitirCeroVacio?: boolean;
}

/**
 * Componente de entrada para cifras monetarias y saldos en POS.
 * Formatea visualmente con puntos de mil en tiempo real sin alterar el valor numérico real.
 * Inmune a ediciones fantasma por desplazamiento de rueda del ratón (mouse wheel).
 */
export const InputDinero = forwardRef<HTMLInputElement, InputDineroProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      mostrarPrefijo = false,
      clasePrefijo = "text-slate-400 font-bold text-sm",
      placeholder,
      className = "",
      disabled = false,
      readOnly = false,
      onKeyDown,
      onFocus,
      onBlur,
      permitirCeroVacio = false,
      ...restProps
    },
    ref
  ) => {
    const inputInternoRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputInternoRef.current as HTMLInputElement);

    const [estaEnFoco, setEstaEnFoco] = useState(false);
    const [textoLocal, setTextoLocal] = useState<string>(() => {
      if (value === 0 && !permitirCeroVacio) return "";
      return formatearMiles(value);
    });

    // Sincronizar con el valor del padre cuando cambia externamente
    useEffect(() => {
      const valorLimpio = String(value ?? "").replace(/\D/g, "");
      const localLimpio = textoLocal.replace(/\D/g, "");

      // Si el valor numérico externo es diferente, actualizar la vista formateada
      if (valorLimpio !== localLimpio) {
        if (value === "" || value === null || value === undefined || (value === 0 && !estaEnFoco && !permitirCeroVacio)) {
          setTextoLocal("");
        } else {
          setTextoLocal(formatearMiles(valorLimpio));
        }
      }
    }, [value, estaEnFoco, permitirCeroVacio, textoLocal]);

    // Calcular la posición del cursor de forma óptima preservando los dígitos a la izquierda
    const recalcularPosicionCursor = (
      rawStr: string,
      cursorOriginal: number,
      formatoNuevo: string
    ): number => {
      const digitosPrevios = rawStr.slice(0, cursorOriginal).replace(/\D/g, "").length;
      if (digitosPrevios === 0) return 0;

      let digitosContados = 0;
      for (let i = 0; i < formatoNuevo.length; i++) {
        if (/\d/.test(formatoNuevo[i])) {
          digitosContados++;
        }
        if (digitosContados === digitosPrevios) {
          return i + 1;
        }
      }
      return formatoNuevo.length;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputEl = e.target;
      const rawValor = inputEl.value;
      const posCursor = inputEl.selectionStart ?? rawValor.length;

      // Extraer solo dígitos
      const digitos = rawValor.replace(/\D/g, "");
      const formateado = formatearMiles(digitos);
      const valorNumerico = digitos ? parseInt(digitos, 10) : 0;

      setTextoLocal(formateado);

      // Restaurar posición natural del cursor tras insertar o remover puntos
      const nuevoCursor = recalcularPosicionCursor(rawValor, posCursor, formateado);
      requestAnimationFrame(() => {
        if (inputInternoRef.current) {
          inputInternoRef.current.setSelectionRange(nuevoCursor, nuevoCursor);
        }
      });

      // Notificar al callback numérico especializado
      if (onValueChange) {
        onValueChange(valorNumerico, formateado);
      }

      // Notificar al callback estándar de React entregando el valor limpio sin puntos
      if (onChange) {
        // Asignar el valor numérico limpio en el evento sintético para no romper lógica del padre
        inputEl.value = digitos;
        onChange(e);
        // Restaurar la visualización con puntos en el elemento DOM
        inputEl.value = formateado;
      }
    };

    const handleKeyDownInterno = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Si el usuario presiona Backspace y el carácter anterior es un punto '.',
      // mover el cursor un espacio a la izquierda para borrar el dígito numérico real
      if (e.key === "Backspace") {
        const input = inputInternoRef.current;
        if (input && input.selectionStart === input.selectionEnd && input.selectionStart !== null) {
          const pos = input.selectionStart;
          if (pos > 0 && input.value[pos - 1] === ".") {
            e.preventDefault();
            const raw = input.value;
            // Remover el dígito a la izquierda del punto
            const parteAntes = raw.slice(0, pos - 2);
            const parteDespues = raw.slice(pos);
            const nuevoRaw = parteAntes + parteDespues;
            const digitos = nuevoRaw.replace(/\D/g, "");
            const formateado = formatearMiles(digitos);
            const valorNum = digitos ? parseInt(digitos, 10) : 0;

            setTextoLocal(formateado);

            const nuevoCursor = Math.max(0, pos - 2);
            requestAnimationFrame(() => {
              if (inputInternoRef.current) {
                inputInternoRef.current.setSelectionRange(nuevoCursor, nuevoCursor);
              }
            });

            if (onValueChange) onValueChange(valorNum, formateado);
            if (onChange) {
              const eventoSintetico = {
                ...e,
                target: { ...input, value: digitos },
                currentTarget: { ...input, value: digitos },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(eventoSintetico);
            }
            return;
          }
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    // Formatear placeholder si contiene un valor numérico puro
    const placeholderFormateado = placeholder && /^\d+$/.test(String(placeholder))
      ? formatearMiles(placeholder)
      : placeholder;

    return (
      <div className={`relative flex items-center ${mostrarPrefijo ? "w-full" : ""}`}>
        {mostrarPrefijo && (
          <span className={`absolute left-3 pointer-events-none select-none ${clasePrefijo}`}>
            $
          </span>
        )}
        <input
          ref={inputInternoRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={textoLocal}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInterno}
          onFocus={(e) => {
            setEstaEnFoco(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setEstaEnFoco(false);
            if (onBlur) onBlur(e);
          }}
          onWheel={(e) => {
            // Prevenir alteración accidental por rueda de ratón (ediciones fantasma)
            e.currentTarget.blur();
          }}
          placeholder={placeholderFormateado}
          disabled={disabled}
          readOnly={readOnly}
          className={`${mostrarPrefijo ? "pl-7" : ""} ${className}`}
          {...restProps}
        />
      </div>
    );
  }
);

InputDinero.displayName = "InputDinero";
export default InputDinero;
