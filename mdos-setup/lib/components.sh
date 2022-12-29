#!/bin/bash

c_reset=""
c_cyan=""
c_grey=""

if [ ! -z $TERM ] && [ "$TERM" != "dumb" ]; then
    command -v tput &> /dev/null || NO_TPUT=1
    if [ -z $NO_TPUT ]; then
        c_reset=$(tput sgr0)
        c_cyan=$(tput setaf 6)
        c_grey=$(tput setaf 243)
    fi
fi

# #############################
# MULTISELECT
# #############################
prompt_for_multiselect() {
    MANDATORY="$3"
    # little helpers for terminal print control and key input
    ESC=$( printf "\033")
    cursor_blink_on()   { printf "$ESC[?25h"; }
    cursor_blink_off()  { printf "$ESC[?25l"; }
    cursor_to()         { printf "$ESC[$1;${2:-1}H"; }
    print_inactive()    { printf "$2   $1 "; }
    print_active()      { printf "$2  $ESC[7m $1 $ESC[27m"; }
    get_cursor_row()    { IFS=';' read -sdR -p $'\E[6n' ROW COL; echo ${ROW#*[}; }
    key_input()         {
		local key
		IFS= read -rsn1 key 2>/dev/null >&2
		if [[ $key = ""      ]]; then echo enter; fi;
		if [[ $key = $'\x20' ]]; then echo space; fi;
		if [[ $key = $'\x1b' ]]; then
			read -rsn2 key
			if [[ $key = [A ]]; then echo up;    fi;
			if [[ $key = [B ]]; then echo down;  fi;
		fi 
    }
    toggle_option()    {
		local arr_name=$1
		eval "local arr=(\"\${${arr_name}[@]}\")"
		local option=$2
		if [[ ${arr[option]} == true ]]; then
			arr[option]=
		else
			arr[option]=true
		fi
		eval $arr_name='("${arr[@]}")'
    }

    local retval=$1
    local options
    local defaults

    IFS=';' read -r -a options <<< "$2"
    if [[ -z $3 ]]; then
      	defaults=()
    else
      	IFS=';' read -r -a defaults <<< "$3"
    fi
    local selected=()

    for ((i=0; i<${#options[@]}; i++)); do
		selected+=("${defaults[i]:-false}")
		printf "\n"
    done

    # determine current screen position for overwriting the options
    local lastrow=`get_cursor_row`
    local startrow=$(($lastrow - ${#options[@]}))

    # ensure cursor and input echoing back on upon a ctrl+c during read -s
    trap "cursor_blink_on; stty echo; printf '\n'; exit" 2
    cursor_blink_off

    local active=0
    while true; do
        # print options by overwriting the last lines
        local idx=0
        for option in "${options[@]}"; do
            local prefix="[ ]"
            if [[ ${selected[idx]} == true ]]; then
              	prefix="[x]"
            fi

            cursor_to $(($startrow + $idx))
            if [ $idx -eq $active ]; then
                print_active "$option" "$prefix"
            else
                print_inactive "$option" "$prefix"
            fi
            ((idx++))
        done

        # user key control
        case `key_input` in
            space)  toggle_option selected $active;;
            enter)
				if [ "$MANDATORY" == "" ]; then
					break
				else
					HAS_ONE=""
					for i in "${!selected[@]}"; do
						if [ "${selected[$i]}" == "true" ]; then
							HAS_ONE=1
						fi
					done
					if [ ! -z $HAS_ONE ]; then
						break
					fi
				fi
				;;
            up)
				((active--));
                if [ $active -lt 0 ]; then active=$((${#options[@]} - 1)); fi
				;;
            down)
				((active++));
                if [ $active -ge ${#options[@]} ]; then active=0; fi
				;;
        esac
    done

    # cursor position back to normal
    cursor_to $lastrow
    printf "\n"
    cursor_blink_on

    eval $retval='("${selected[@]}")'
}

# #############################
# SELECT
# #############################
prompt_for_select() {
    # little helpers for terminal print control and key input
    ESC=$( printf "\033")
    cursor_blink_on()   { printf "$ESC[?25h"; }
    cursor_blink_off()  { printf "$ESC[?25l"; }
    cursor_to()         { printf "$ESC[$1;${2:-1}H"; }
    print_inactive()    { printf "$2   $1 "; }
    print_active()      { printf "$2  $ESC[7m $1 $ESC[27m"; }
    get_cursor_row()    { IFS=';' read -sdR -p $'\E[6n' ROW COL; echo ${ROW#*[}; }
    key_input()         {
		local key
		IFS= read -rsn1 key 2>/dev/null >&2
		if [[ $key = ""      ]]; then echo enter; fi;
		if [[ $key = $'\x20' ]]; then echo space; fi;
		if [[ $key = $'\x1b' ]]; then
			read -rsn2 key
			if [[ $key = [A ]]; then echo up;    fi;
			if [[ $key = [B ]]; then echo down;  fi;
		fi 
    }
    toggle_option()    {
		local arr_name=$1
		eval "local arr=(\"\${${arr_name}[@]}\")"
		local option=$2
		if [[ ${arr[option]} == true ]]; then
			arr[option]=
		else
			arr[option]=true
		fi
		eval $arr_name='("${arr[@]}")'
    }

    local retval=$1
    local options
    local defaults

    IFS=';' read -r -a options <<< "$2"
    if [[ -z $3 ]]; then
      	defaults=()
    else
      	IFS=';' read -r -a defaults <<< "$3"
    fi
    local selected=()

    for ((i=0; i<${#options[@]}; i++)); do
		selected+=("${defaults[i]:-false}")
		printf "\n"
    done

    # determine current screen position for overwriting the options
    local lastrow=`get_cursor_row`
    local startrow=$(($lastrow - ${#options[@]}))

    # ensure cursor and input echoing back on upon a ctrl+c during read -s
    trap "cursor_blink_on; stty echo; printf '\n'; exit" 2
    cursor_blink_off

    local active=0
    while true; do
        # print options by overwriting the last lines
        local idx=0
        for option in "${options[@]}"; do
            local prefix=">"
            cursor_to $(($startrow + $idx))
            if [ $idx -eq $active ]; then
                print_active "$option" "$prefix"
            else
                print_inactive "$option" "$prefix"
            fi
            ((idx++))
        done

        # user key control
        case `key_input` in
            enter)
				toggle_option selected $active 
				break
				;;
            up)
				((active--));
                if [ $active -lt 0 ]; then active=$((${#options[@]} - 1)); fi
				;;
            down)
				((active++));
                if [ $active -ge ${#options[@]} ]; then active=0; fi
				;;
        esac
    done

    # cursor position back to normal
    cursor_to $lastrow
    printf "\n"
    cursor_blink_on

    eval $retval='("${selected[@]}")'
}

# #############################
# USER INPUT
# #############################
user_input() {
    local  __resultvar=$1

    _Q="${c_cyan}$2${c_reset} "
    if [ ! -z $3 ]; then
        _Q="$_Q${c_grey}($3)${c_reset} "
    fi

    read -p "$_Q" inputval
    if [ "$3" == "" ]; then
        while [ "$inputval" == "" ]; do
            read -p "Value required, try again: " inputval
        done
    else
        if [ "$inputval" == "" ]; then
            inputval="$3"
        fi
    fi
    
    eval $__resultvar="'$inputval'"
	echo ""
}

# #############################
# REGEX USER INPUT
# #############################
regex_user_input() {
    local  __resultvar=$1

    MVAL=''
    user_input MVAL "$2" "$3"

    if [ "$4" == "k8s-name" ]; then
        while ! [[ "$MVAL" =~ ^[a-z]+[a-z0-9\-]{2,20}$ ]]; do
            warn "Invalide value. Try again"
            user_input MVAL "$2" "$3"
        done
    elif [ "$4" == "pos-int" ]; then
        while ! [[ "$MVAL" =~ ^[1-9][0-9]*$ ]]; do
            warn "Invalide value. Try again"
            user_input MVAL "$2" "$3"
        done
    elif [ "$4" == "docker-img" ]; then
        while ! [[ "$MVAL" =~ ^[a-zA-Z0-9\-]*$ ]]; do
            warn "Invalide value. Try again"
            user_input MVAL "$2" "$3"
        done
    elif [ "$4" == "hostname" ]; then
        while ! [[ "$MVAL" =~ ^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$ ]]; do
            warn "Invalide value. Try again"
            user_input MVAL "$2" "$3"
        done
    fi
    
    eval $__resultvar="'$MVAL'"
}

# #############################
# YES_NO
# #############################
yes_no() {
    local  __resultvar=$1
    OPTIONS_STRING=("Yes;No;")
    question "$2"
    if [ ! -z $3 ]; then set +Ee; fi
    prompt_for_select SELECTED "$OPTIONS_STRING"
    if [ ! -z $3 ]; then set -Ee; fi
    for i in "${!SELECTED[@]}"; do
        if [ "${SELECTED[$i]}" == "true" ]; then
          	if [ "$i" == "0" ]; then eval $__resultvar="yes"; else eval $__resultvar="no"; fi
        fi
    done
}